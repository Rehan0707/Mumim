import sys
from pathlib import Path
from datetime import datetime, timezone

# Add ml folder to path
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from ml.forecast.forecast import predict_forecast, _get_cache_key
from app.models import Order, OrderItem, Product, Customer


def test_forecast_returns_seven_days(db, business_id):
    # Should generate a 7-day forecast
    forecast = predict_forecast(db, business_id)
    assert len(forecast) == 7
    for item in forecast:
        assert "date" in item
        assert "revenue" in item
        assert isinstance(item["revenue"], (int, float))
        assert item["revenue"] >= 0.0


def test_forecast_cache_key(db, business_id):
    # Cache key should remain same if no new orders
    key1 = _get_cache_key(db, business_id)
    key2 = _get_cache_key(db, business_id)
    assert key1 == key2
    assert key1[0] == business_id


def test_forecast_empty_orders_fallback(db, business_id):
    # Delete all orders for the business and ensure forecast falls back cleanly without crashing
    db.query(OrderItem).delete()
    db.query(Order).delete()
    db.commit()

    forecast = predict_forecast(db, business_id)
    assert len(forecast) == 7
    for item in forecast:
        assert item["revenue"] == 0.0


def test_analytics_summary_endpoint(client, business_id):
    # Verify the GET endpoint returns the forecast field correctly
    response = client.get(f"/analytics/summary?business_id={business_id}")
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert len(data["forecast"]) == 7
    for item in data["forecast"]:
        assert "date" in item
        assert "revenue" in item
