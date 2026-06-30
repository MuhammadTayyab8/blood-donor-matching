import os

# Mock database of sent WhatsApp messages for verification
MOCK_WHATSAPP_LOGS = []

def send_whatsapp_message(to_number: str, message: str) -> bool:
    """Simulates sending a WhatsApp message."""
    mock_entry = {
        "to": to_number,
        "message": message,
        "timestamp": os.getenv("CURRENT_TIME", "Just Now")
    }
    MOCK_WHATSAPP_LOGS.append(mock_entry)
    print(f"[Simulated WhatsApp] Sent to {to_number}: {message}")
    return True
