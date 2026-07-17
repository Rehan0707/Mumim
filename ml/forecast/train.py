"""Standalone training and prediction script for ML demand forecasting.

Can be run from command line:
    PYTHONPATH=../backend python train.py
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add root directory to path so we can import backend.app modules
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
backend_dir = ROOT / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.app.db import SessionLocal
from backend.app.models import Business
from forecast import predict_forecast


def run_training():
    db = SessionLocal()
    try:
        # Find first business
        biz = db.query(Business).first()
        if not biz:
            print("❌ No business found in the database. Please run seed script first:")
            print("   cd backend && python -m app.seed")
            return
            
        print(f"📊 Business found: {biz.name} ({biz.id})")
        print("🤖 Training LightGBM and generating 7-day demand forecast...")
        
        forecast = predict_forecast(db, biz.id)
        
        print("\n📈 Predicted 7-day Demand Forecast:")
        print("=" * 40)
        print(f"{'Date':<15} | {'Predicted Revenue':<20}")
        print("-" * 40)
        for f in forecast:
            print(f"{f['date']:<15} | Rs. {f['revenue']:>15,.2f}")
        print("=" * 40)
        print("✅ Forecast generated successfully!")
        
    finally:
        db.close()


if __name__ == "__main__":
    run_training()
