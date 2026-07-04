"""Order lifecycle + transactional inventory (spec A3)."""
import pytest

from app.models import Business, Customer, Product
from app.services import orders as osvc


def _first_product(db, business_id):
    return db.query(Product).filter(Product.business_id == business_id).first()


def _first_customer(db, business_id):
    return db.query(Customer).filter(Customer.business_id == business_id).first()


def test_reserve_decrements_stock(db, business_id):
    product = _first_product(db, business_id)
    customer = _first_customer(db, business_id)
    start = product.stock_qty

    order = osvc.place_order(db, business_id, customer.id, [{"product_id": product.id, "qty": 2}])
    db.refresh(product)

    assert order.status == "reserved"
    assert product.stock_qty == start - 2
    assert float(order.total) == float(product.price) * 2


def test_oversell_is_blocked(db, business_id):
    product = _first_product(db, business_id)
    customer = _first_customer(db, business_id)
    start = product.stock_qty

    with pytest.raises(osvc.OutOfStock):
        osvc.place_order(db, business_id, customer.id, [{"product_id": product.id, "qty": start + 100}])

    db.refresh(product)
    assert product.stock_qty == start  # rolled back, no partial decrement


def test_mark_paid_is_idempotent_and_updates_crm(db, business_id):
    product = _first_product(db, business_id)
    customer = _first_customer(db, business_id)
    spend_before = float(customer.total_spend or 0)

    order = osvc.place_order(db, business_id, customer.id, [{"product_id": product.id, "qty": 1}])
    osvc.mark_paid(db, order, payment_ref="pay_1")
    osvc.mark_paid(db, order, payment_ref="pay_1")  # second call is a no-op

    db.refresh(customer)
    assert order.status == "paid"
    assert float(customer.total_spend) == spend_before + float(order.total)


def test_cancel_restores_stock(db, business_id):
    product = _first_product(db, business_id)
    customer = _first_customer(db, business_id)
    start = product.stock_qty

    order = osvc.place_order(db, business_id, customer.id, [{"product_id": product.id, "qty": 3}])
    osvc.cancel_order(db, order)
    db.refresh(product)

    assert order.status == "cancelled"
    assert product.stock_qty == start
