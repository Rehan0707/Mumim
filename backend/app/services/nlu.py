import os
import json
from groq import Groq

# Groq client initialize kar rahe hain
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def parse(user_message: str) -> dict:
    """
    True AI Intent & Language Router using Llama-3 JSON mode.
    Returns: {"intent": "QUERY", "lang": "hi"}
    """
    
    # Prompt ko strictly JSON output dene ke liye train kiya gaya hai
    system_prompt = """You are the NLU (Natural Language Understanding) brain for a WhatsApp shopping bot.
    Your ONLY job is to analyze the user's message and return a JSON object with exactly two keys: 'intent' and 'lang'.
    
    Rules for 'intent':
    1. GREETING: Greetings, hellos, namaste.
    2. QUERY: Asking for EXACT, SPECIFIC items or their prices (e.g., "I want Tata salt", "do you have Parle G", "price of blue jeans"). DO NOT use this if the user asks for a general category.
    3. ORDER: Confirming a purchase, saying 'reserve it', 'done', 'book it', 'order karni hai'.
    4. COMPLAINT: Asking for refunds, reporting defective items.
    5. UNKNOWN: Asking for general categories, full menus, or options (e.g., "I want to buy grocery items", "show me clothes", "what do you sell?", "kya bechte ho"), or unrelated text.

    Rules for 'lang':
    - "en": If the user is typing in pure English.
    - "hi": If the user is typing in Hindi, Hinglish, or Marathi.
    
    CRITICAL RULE: Respond ONLY with a valid JSON object. No markdown formatting, no conversational text.
    Example valid output: {"intent": "UNKNOWN", "lang": "en"}"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.0, # 0.0 taaki AI creative na bane, sirf strict classification kare
            response_format={"type": "json_object"} # Ye Groq ko force karega ki output valid JSON ho
        )
        
        # LLM ka answer nikalo aur JSON ko Python dictionary mein convert karo
        response_text = chat_completion.choices[0].message.content.strip()
        parsed_data = json.loads(response_text)
        
        intent = parsed_data.get("intent", "UNKNOWN").upper()
        lang = parsed_data.get("lang", "en").lower()
        
        # Ek chota sa safety net
        valid_intents = ["GREETING", "QUERY", "ORDER", "COMPLAINT", "UNKNOWN"]
        if intent not in valid_intents:
            intent = "UNKNOWN"
            
        return {"intent": intent, "lang": lang}
        
    except Exception as e:
        print(f"\n🔥🔥 Groq NLU Error: {e} 🔥🔥\n")
        # Agar kuch fategi toh system crash nahi hoga, safe default bhej dega
        return {"intent": "UNKNOWN", "lang": "en"}

# Agar tumhari pipeline purane system ke liye direct intent function call karti thi, toh isko bhi rakh lo
def get_intent(user_message: str) -> str:
    result = parse(user_message)
    return result["intent"]