"""LightGBM-based demand forecasting model.

If LightGBM is not installed, or if there is insufficient historical data,
the model gracefully falls back to a naive moving-average projection.
"""
from __future__ import annotations

import os
# Avoid OpenMP collision segfaults (especially on Apple Silicon / macOS under pytest/uvicorn)
os.environ.setdefault("OMP_NUM_THREADS", "1")

import logging
import random
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

# Setup logging
log = logging.getLogger("munim.forecast")

# Simple in-memory cache to avoid re-training LightGBM on every single request.
# Key is (business_id, last_order_id, last_order_time_str)
_FORECAST_CACHE: Dict[Tuple[str, Optional[str], Optional[str]], List[Dict[str, Any]]] = {}


def _get_cache_key(db: Session, business_id: str) -> Tuple[str, Optional[str], Optional[str]]:
    """Generate a cache key based on the latest paid order."""
    from app.models import Order
    
    last_order = (
        db.query(Order.id, Order.created_at)
        .filter(Order.business_id == business_id, Order.status.in_(("paid", "fulfilled")))
        .order_by(Order.created_at.desc())
        .first()
    )
    if last_order:
        last_id, last_time = last_order
        time_str = last_time.isoformat() if last_time else None
        return (business_id, last_id, time_str)
    return (business_id, None, None)


def _naive_forecast(revenue_trend: List[Dict[str, Any]], today: date) -> List[Dict[str, Any]]:
    """Simple moving-average fallback forecast."""
    avg_daily = (sum(x["revenue"] for x in revenue_trend) / 7) if revenue_trend else 0.0
    return [
        {"date": (today + timedelta(days=i)).isoformat(), "revenue": round(max(0.0, avg_daily), 2)}
        for i in range(1, 8)
    ]


def _build_revenue_trend(db: Session, business_id: str, today: date) -> List[Dict[str, Any]]:
    """Replicates the 7-day revenue trend logic from analytics.py."""
    from app.models import Order
    
    paid_orders = (
        db.query(Order)
        .filter(Order.business_id == business_id, Order.status.in_(("paid", "fulfilled")))
        .all()
    )
    trend = {}
    for o in paid_orders:
        if o.paid_at:
            dt_str = o.paid_at.date().isoformat()
            trend[dt_str] = trend.get(dt_str, 0.0) + float(o.total)
            
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    return [{"date": d, "revenue": round(trend.get(d, 0.0), 2)} for d in days]


def predict_forecast(db: Session, business_id: str) -> List[Dict[str, Any]]:
    """Predict 7-day revenue forecast using LightGBM if possible, otherwise moving average."""
    cache_key = _get_cache_key(db, business_id)
    
    global _FORECAST_CACHE
    if cache_key in _FORECAST_CACHE:
        log.info("Returning cached forecast for business %s", business_id)
        return _FORECAST_CACHE[cache_key]
        
    forecast_res = _compute_forecast(db, business_id)
    # Cache the result
    _FORECAST_CACHE[cache_key] = forecast_res
    return forecast_res


def _compute_forecast(db: Session, business_id: str) -> List[Dict[str, Any]]:
    """Internal method to perform the forecast computation/modeling."""
    from app.models import Order
    
    today = datetime.now(timezone.utc).date()
    
    # 1. Fetch paid/fulfilled orders
    orders = (
        db.query(Order)
        .filter(Order.business_id == business_id, Order.status.in_(("paid", "fulfilled")))
        .order_by(Order.created_at.asc())
        .all()
    )
    
    # Build a fallback trend list (needed for moving-average calculation)
    revenue_trend = _build_revenue_trend(db, business_id, today)
    
    if not orders:
        return _naive_forecast(revenue_trend, today)
        
    # 2. Check for LightGBM availability
    try:
        import lightgbm as lgb
    except ImportError:
        log.warning("LightGBM not installed. Falling back to moving-average forecast.")
        return _naive_forecast(revenue_trend, today)
        
    # 3. Group order totals by local date
    daily_revenue: Dict[date, float] = {}
    for o in orders:
        if o.created_at:
            dt = o.created_at.date()
            daily_revenue[dt] = daily_revenue.get(dt, 0.0) + float(o.total)
            
    if not daily_revenue:
        return _naive_forecast(revenue_trend, today)
        
    # Find start and end date
    dates = sorted(daily_revenue.keys())
    start_date = dates[0]
    end_date = dates[-1]
    if end_date < today:
        end_date = today
        
    # Generate continuous daily series
    curr = start_date
    history: List[Tuple[date, float]] = []
    while curr <= end_date:
        history.append((curr, daily_revenue.get(curr, 0.0)))
        curr += timedelta(days=1)
        
    # If history is too short, we fall back to moving average
    unique_sales_days = len([r for r in daily_revenue.values() if r > 0])
    if len(history) < 5 or unique_sales_days < 3:
        log.info("Insufficient sales history (%d days). Using moving average.", len(history))
        return _naive_forecast(revenue_trend, today)
        
    # 4. Data Augmentation / Padding
    # To prevent overfitting and avoid NaN/null features when history is short,
    # we prepopulate a baseline series of 30 days before start_date with slight noise.
    actual_mean = np.mean([val for _, val in history])
    padded_history: List[Tuple[date, float]] = []
    
    # Generate 30 days of baseline dummy data
    for i in range(30, 0, -1):
        dummy_date = start_date - timedelta(days=i)
        # Baseline is 10% of mean with +/- 5% noise to maintain stability
        val = max(0.0, actual_mean * 0.1 + random.uniform(-actual_mean * 0.05, actual_mean * 0.05))
        padded_history.append((dummy_date, val))
        
    padded_history.extend(history)
    
    # 5. Feature Engineering Helper
    def get_features(hist_list: List[Tuple[date, float]], target_idx: int) -> Tuple[Dict[str, float], float]:
        dt, val = hist_list[target_idx]
        
        # Lags
        lag1 = hist_list[target_idx - 1][1]
        lag2 = hist_list[target_idx - 2][1]
        lag7 = hist_list[target_idx - 7][1]
        
        # Rolling Means
        roll3 = np.mean([hist_list[target_idx - k][1] for k in range(1, 4)])
        roll7 = np.mean([hist_list[target_idx - k][1] for k in range(1, 8)])
        
        feats = {
            "day_of_week": float(dt.weekday()),
            "day_of_month": float(dt.day),
            "month": float(dt.month),
            "lag_1": lag1,
            "lag_2": lag2,
            "lag_7": lag7,
            "roll_3": roll3,
            "roll_7": roll7,
        }
        return feats, val

    # Build dataset for training (we can start feature extraction from index 7)
    X_train: List[List[float]] = []
    y_train: List[float] = []
    
    feature_names = ["day_of_week", "day_of_month", "month", "lag_1", "lag_2", "lag_7", "roll_3", "roll_7"]
    
    for idx in range(7, len(padded_history)):
        feats, target = get_features(padded_history, idx)
        X_train.append([feats[name] for name in feature_names])
        y_train.append(target)
        
    # 6. Train LightGBM model
    # Very conservative params to prevent overfitting on small/seeded datasets
    params = {
        "objective": "regression",
        "metric": "rmse",
        "verbosity": -1,
        "learning_rate": 0.05,
        "num_leaves": 7,
        "min_data_in_leaf": 2,
        "max_depth": 3,
        "random_state": 42,
    }
    
    try:
        train_data = lgb.Dataset(np.array(X_train), label=np.array(y_train), feature_name=feature_names)
        model = lgb.train(params, train_data, num_boost_round=40)
    except Exception as exc:
        log.error("Failed to train LightGBM: %s. Using moving-average fallback.", exc)
        return _naive_forecast(revenue_trend, today)
        
    # 7. Autoregressive Recursive Forecasting (next 7 days)
    forecast_series = list(padded_history)
    predictions: List[Dict[str, Any]] = []
    
    for i in range(1, 8):
        pred_date = today + timedelta(days=i)
        pred_idx = len(forecast_series)
        
        # Build features for pred_date using current history + past predictions
        # We temporarily append a placeholder for the target value to use get_features
        forecast_series.append((pred_date, 0.0))
        feats, _ = get_features(forecast_series, pred_idx)
        
        # Predict
        X_pred = np.array([[feats[name] for name in feature_names]])
        pred_val = model.predict(X_pred)[0]
        pred_val = max(0.0, pred_val) # non-negativity guard
        
        # Update the series with the actual prediction
        forecast_series[pred_idx] = (pred_date, pred_val)
        
        predictions.append({
            "date": pred_date.isoformat(),
            "revenue": round(pred_val, 2)
        })
        
    log.info("LightGBM forecast completed successfully for business %s", business_id)
    return predictions
