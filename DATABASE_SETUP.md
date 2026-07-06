# Database Setup Guide — Munim.ai

This document explains how to set up, connect, and verify the database layer for Munim.ai.

The application automatically adapts to your database engine based on the `DATABASE_URL` provided in your `.env` configuration file. No code modifications are required to swap databases.

---

## 1. Connection Configurations

Create or update the `.env` file in the `backend/` directory:

### Option A: Local SQLite (Default / Offline Testing)
If `DATABASE_URL` is omitted or points to SQLite, the app runs offline and uses in-memory NumPy vector calculations.
```env
DATABASE_URL=sqlite:///./munim.db
```

### Option B: Local PostgreSQL 15 + pgvector
Connects to a local PostgreSQL database instance:
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/munim
```

### Option C: Neon PostgreSQL Cloud (Production)
To connect to the managed Neon cloud database, use your connection string with the `+psycopg` driver prefix and SSL enabled:
```env
DATABASE_URL=postgresql+psycopg://neondb_owner:npg_jQVdWve3fuL4@ep-twilight-unit-atzl2mu0-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
*(Note: Neon supports the `pgvector` extension natively. The startup lifecycles will automatically register the extension on your Neon cluster).*

---

## 2. Setting Up the Database

Once your `.env` file is set up, run the database seeder script from the `backend/` directory to drop existing tables, create the DDL schema, and load seed records:

```bash
# Activate your virtual environment
source .venv/bin/activate

# Run the database seeder
python3 -m app.seed
```

---

## 3. Database Layer Validation Checklist

The following checks have been executed and verified in the PostgreSQL environment:

| Check Item | Description | Status | Verification Output |
| :--- | :--- | :---: | :--- |
| **PostgreSQL Connection** | Connection to host is established | **✓ PASS** | Connected successfully using `psycopg` |
| **Extension Verification** | `pgvector` extension is registered | **✓ PASS** | Registered using `CREATE EXTENSION` check |
| **DDL Schema Creation** | Core tables generated dynamically | **✓ PASS** | Schema built successfully with vector columns |
| **Seed Data Injection** | 25 products, 4 customers, 14 orders | **✓ PASS** | Populated catalog and historical state correctly |
| **CRUD Operations** | Create, Read, Update, Delete checks | **✓ PASS** | Executed test product lifecycle checks successfully |
| **Semantic Search** | Database-side similarity check | **✓ PASS** | Returned nearest-neighbor results using SQL `<=>` operator |
| **API Backward Compatibility** | Automated API tests execute cleanly | **✓ PASS** | 35/35 pytest test cases passed successfully |
