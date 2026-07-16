from gtts import gTTS
import os

def test_bot_voice(text, output_filename="bot_reply.ogg"):
    print(f"🤖 Bot is thinking to say: '{text}'")
    
    # Language 'hi' (Hindi) set kar rahe hain taaki accent natural lage
    tts = gTTS(text=text, lang='hi', slow=False)
    
    # File save kar rahe hain
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, output_filename)
    
    tts.save(output_path)
    print(f"✅ Voice generated and saved at: {output_path}")

if __name__ == "__main__":
    # Test message
    reply_message = "हाँ भाई, नाइकी के जूते साइज नौ में मिल जायेंगे। क्या मैं आपका आर्डर कन्फर्म कर दूँ?"
    test_bot_voice(reply_message)