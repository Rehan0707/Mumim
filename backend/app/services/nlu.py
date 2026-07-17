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
Your ONLY job is to analyze the user's message and return a JSON object with exactly three keys: 'intent', 'lang', and 'entities'.

Rules for 'intent':
1. GREETING: Greetings, hellos.
2. QUERY: Asking for EXACT items or prices.
3. ORDER: If the user says 'reserve', 'yes', 'do it', or 'ok', classify the intent as CONFIRM. Do NOT extract these words as a 'product' entity..
4. UNKNOWN: Asking for general categories or unrelated text.
Rules:
1. If the user asks for an item (e.g., "I want amul butter"), Intent is SEARCH_PRODUCT and Entity is {"product": "amul butter"}.
2. If the user is responding to a confirmation like "Shall I reserve it?" with words like "Yes", "Reserve it", "Ok", or "Do it", the Intent MUST be CONFIRM_ORDER. Do NOT extract any product entities.
3. If the user says "No", Intent is CANCEL_ORDER.
Rules for 'lang':
- "en": Pure English.
- "hi": Hindi, Hinglish, or Marathi.

CRITICAL RULES FOR 'entities':
- If intent is QUERY, you MUST extract the core product name and put it in a 'product' key.
- REMOVE extra words like "I want to buy", "show me", "price of".
- Example User Input: "I want to buy amul butter"
- Example Output: {"intent": "QUERY", "lang": "en", "entities": {"product": "amul butter"}}

Respond ONLY with a valid, parsable JSON object. Do not include markdown blocks like ```json ."""
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
       # ... upar ka code same rahega ...
        
        valid_intents = ["GREETING", "QUERY", "ORDER", "COMPLAINT", "UNKNOWN"]
        if intent not in valid_intents:
            intent = "UNKNOWN"
            
        # 🔥 FIX: Yahan 'entities' ko dictionary mein shamil kar le
        entities = parsed_data.get("entities", {})
            
        return {"intent": intent, "lang": lang, "entities": entities}
        
    except Exception as e:
        print(f"\n🔥🔥 Groq NLU Error: {e} 🔥🔥\n")
        # Agar kuch fategi toh system crash nahi hoga, safe default bhej dega
        return {"intent": "UNKNOWN", "lang": "en"}

# Agar tumhari pipeline purane system ke liye direct intent function call karti thi, toh isko bhi rakh lo
def get_intent(user_message: str) -> str:
    result = parse(user_message)
    return result["intent"]