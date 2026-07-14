"""Rule-based NLU: intent, entities, language."""
from app.services import nlu
from app.services import reply


def test_query_intent_and_entities():
    r = nlu.parse("Nike shoes size 9 available?")
    assert r.intent in ("QUERY", "ORDER")
    assert r.entities.get("size") == "9"
    assert "nike" in r.entities.get("keywords", [])


def test_greeting_intent():
    assert nlu.parse("hello").intent == "GREETING"


def test_confirmation_is_order():
    assert nlu.parse("yes").intent == "ORDER"


def test_last_order_intent():
    assert nlu.parse("what was my last order").intent == "LAST_ORDER"


def test_complaint_intent():
    assert nlu.parse("this item is defective, I want a refund").intent == "COMPLAINT"


def test_hindi_language_detection():
    assert nlu.detect_lang("kitna hai bhai") == "hi"
    assert nlu.detect_lang("how much is this") == "en"


def test_quantity_extraction():
    r = nlu.parse("2 kg rice chahiye")
    assert r.entities.get("qty") == 2


def test_local_fallback_fast_path_for_tests():
    assert "Maggi" in reply.fallback("en", "do you have maggi?")
