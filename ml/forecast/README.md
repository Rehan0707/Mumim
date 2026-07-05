# ml/forecast — Demand forecast & restock (LightGBM)  ·  Role 2

Train LightGBM/Prophet on order history to forecast revenue and flag restock needs.
Batch-precompute and cache; the backend serves it on the analytics endpoint.

**Contract to match:** produce `{"revenue_trend": [...], "forecast": [...], "restock": [...]}`
consumable by the dashboard.

Backend seam: `backend/app/routers/analytics.py` (currently a moving-average stub).
Training data: `../data/`.
