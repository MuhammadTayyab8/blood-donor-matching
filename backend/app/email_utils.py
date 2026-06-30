import os
import smtplib
import threading
from email.message import EmailMessage
from datetime import datetime


from dotenv import load_dotenv

load_dotenv()

# In-memory mock email storage for testing
MOCK_EMAIL_INBOX = []

# Base URL for interactive links (frontend or backend callback)
BASE_API_URL = os.getenv("BASE_API_URL", "http://localhost:8000")

def get_base_html_template(title: str, content: str) -> str:
    """Returns a beautiful HTML template using modern typography and HSL colors."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <style>
            body {{
                font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f7fafc;
                margin: 0;
                padding: 0;
                color: #2d3748;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                overflow: hidden;
                border: 1px solid #edf2f7;
            }}
            .header {{
                background: linear-gradient(135deg, #e53e3e 0%, #b83280 100%);
                padding: 30px 40px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 26px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }}
            .content {{
                padding: 40px;
                line-height: 1.7;
                font-size: 16px;
            }}
            .card {{
                background-color: #f7fafc;
                border-radius: 12px;
                padding: 24px;
                margin: 24px 0;
                border: 1px solid #e2e8f0;
            }}
            .card-title {{
                font-weight: 700;
                color: #e53e3e;
                margin-top: 0;
                margin-bottom: 16px;
                font-size: 18px;
            }}
            .card-row {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                border-bottom: 1px dashed #edf2f7;
                padding-bottom: 8px;
            }}
            .card-row:last-child {{
                border-bottom: none;
                padding-bottom: 0;
                margin-bottom: 0;
            }}
            .label {{
                font-weight: 600;
                color: #718096;
            }}
            .value {{
                color: #2d3748;
                font-weight: 700;
            }}
            .btn-group {{
                margin-top: 32px;
                text-align: center;
                display: flex;
                justify-content: center;
                gap: 16px;
            }}
            .btn {{
                display: inline-block;
                padding: 14px 28px;
                font-size: 15px;
                font-weight: 700;
                text-decoration: none;
                border-radius: 10px;
                transition: transform 0.2s, box-shadow 0.2s;
            }}
            .btn-primary {{
                background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
                color: #ffffff !important;
                box-shadow: 0 4px 14px 0 rgba(229, 62, 62, 0.4);
            }}
            .btn-secondary {{
                background-color: #edf2f7;
                color: #4a5568 !important;
                border: 1px solid #cbd5e0;
            }}
            .footer {{
                background-color: #f7fafc;
                padding: 24px 40px;
                text-align: center;
                font-size: 13px;
                color: #a0aec0;
                border-top: 1px solid #edf2f7;
            }}
            .footer a {{
                color: #e53e3e;
                text-decoration: none;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>RedLine AI Dispatcher</h1>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                This is an automated request by RedLine Blood Donation Matching Network.<br>
                Need help? Contact us at <a href="mailto:support@redline.life">support@redline.life</a>
            </div>
        </div>
    </body>
    </html>
    """



MOCK_EMAIL_INBOX = []


def send_html_email(
    to_email: str,
    subject: str,
    html_body: str
) -> bool:

    """
    Send HTML email using SMTP.
    Falls back to mock inbox if SMTP is not configured.
    """

    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")

    sender_email = os.getenv(
        "SMTP_SENDER",
        smtp_username
    )


    # Mock storage
    MOCK_EMAIL_INBOX.append({
        "id": len(MOCK_EMAIL_INBOX) + 1,
        "to": to_email,
        "subject": subject,
        "body": html_body,
        "sent_at": datetime.utcnow().isoformat()
    })


    if not smtp_username or not smtp_password:
        print("SMTP missing. Saved to mock inbox.")
        return True


    try:

        msg = EmailMessage()

        msg["From"] = sender_email
        msg["To"] = to_email
        msg["Subject"] = subject


        # HTML email
        msg.add_alternative(
            html_body,
            subtype="html"
        )


        # Gmail SSL port 465
        with smtplib.SMTP_SSL(
            smtp_server,
            smtp_port
        ) as smtp:

            smtp.login(
                smtp_username,
                smtp_password
            )

            smtp.send_message(msg)


        print(
            f"Email sent to {to_email}"
        )

        return True



    except Exception as e:

        print(
            f"Email failed: {e}"
        )

        return False
    
print(MOCK_EMAIL_INBOX)

# --- High-Level Templates ---

def send_donor_outreach_email(donor_email: str, donor_name: str, request_id: int, wave_id: int, donor_id: int, blood_group: str, hospital: str, urgency: str) -> bool:
    """Sends a beautifully styled outreach email to a potential matching donor."""
    subject = f"🚨 URGENT: Blood Request for {blood_group} at {hospital}"
    
    accept_link = f"{BASE_API_URL}/api/interactions/outreach-response?status=Accepted&request_id={request_id}&wave_id={wave_id}&donor_id={donor_id}"
    decline_link = f"{BASE_API_URL}/api/interactions/outreach-response?status=Declined&request_id={request_id}&wave_id={wave_id}&donor_id={donor_id}"
    
    content = f"""
    <p>Hello <strong>{donor_name}</strong>,</p>
    <p>An emergency blood request has been launched that matches your profile. A patient requires <strong>{blood_group}</strong> blood urgently.</p>
    
    <div class="card">
        <h3 class="card-title">Blood Request details</h3>
        <div class="card-row">
            <span class="label">Hospital:</span>
            <span class="value">{hospital}</span>
        </div>
        <div class="card-row">
            <span class="label">Required Group:</span>
            <span class="value" style="color: #e53e3e; font-size: 18px;">{blood_group}</span>
        </div>
        <div class="card-row">
            <span class="label">Urgency:</span>
            <span class="value" style="color: #e53e3e;">{urgency}</span>
        </div>
    </div>
    
    <p>Can you make a donation? Your quick response helps the doctors coordinate the surgery.</p>
    
    <div class="btn-group">
        <a href="{accept_link}" class="btn btn-primary">Yes, I can donate</a>
        <a href="{decline_link}" class="btn btn-secondary">No, I am unavailable</a>
    </div>
    """
    
    html = get_base_html_template(subject, content)
    return send_html_email(donor_email, subject, html)

def send_requester_confirmation_email(requester_email: str, request_id: int, blood_group: str, hospital: str, units: int) -> bool:
    """Sends confirmation to the requester with a live tracking link."""
    subject = f"🩸 Request #{request_id} Active - RedLine AI Matching"
    tracking_link = f"http://localhost:3000/requests/{request_id}"
    
    content = f"""
    <p>Hello,</p>
    <p>Your blood request has been received and processed by our AI Dispatcher. We have identified matching donors and launched Wave 1 outreach.</p>
    
    <div class="card">
        <h3 class="card-title">Request Summary</h3>
        <div class="card-row">
            <span class="label">Request ID:</span>
            <span class="value">#{request_id}</span>
        </div>
        <div class="card-row">
            <span class="label">Hospital:</span>
            <span class="value">{hospital}</span>
        </div>
        <div class="card-row">
            <span class="label">Blood Group:</span>
            <span class="value">{blood_group}</span>
        </div>
        <div class="card-row">
            <span class="label">Units Needed:</span>
            <span class="value">{units} Units</span>
        </div>
    </div>
    
    <p>You can track the live donation progress, wave escalations, and secured units in real-time on our tracking page:</p>
    
    <div class="btn-group">
        <a href="{tracking_link}" class="btn btn-primary">View Live Progress Tracker</a>
    </div>
    """
    
    html = get_base_html_template(subject, content)
    return send_html_email(requester_email, subject, html)


def send_requester_donor_update_email(requester_email: str, request_id: int, donor_name: str, blood_group: str, hospital: str, units_confirmed: int, units_required: int) -> bool:
    """Send an email update when a donor accepts a request."""
    subject = f"✅ Donor Confirmed for Request #{request_id}"
    tracking_link = f"http://localhost:3000/requests/{request_id}"

    content = f"""
    <p>Hello,</p>
    <p>One of your matched donors has confirmed for your blood request.</p>
    <div class="card">
        <h3 class="card-title">Donor Secured</h3>
        <div class="card-row">
            <span class="label">Donor:</span>
            <span class="value">{donor_name}</span>
        </div>
        <div class="card-row">
            <span class="label">Blood Group:</span>
            <span class="value">{blood_group}</span>
        </div>
        <div class="card-row">
            <span class="label">Hospital:</span>
            <span class="value">{hospital}</span>
        </div>
        <div class="card-row">
            <span class="label">Units Secured:</span>
            <span class="value">{units_confirmed} / {units_required}</span>
        </div>
    </div>
    <p>You can view the latest status and donor details here:</p>
    <div class="btn-group">
        <a href="{tracking_link}" class="btn btn-primary">View Live Tracker</a>
    </div>
    """

    html = get_base_html_template(subject, content)
    return send_html_email(requester_email, subject, html)


def send_requester_fulfillment_summary_email(requester_email: str, request_id: int, blood_group: str, hospital: str, units_required: int, donor_list: list[dict]) -> bool:
    """Send a final summary email when a request is fully fulfilled."""
    subject = f"🎉 Request #{request_id} Fulfilled - Donor Details"
    donor_rows = "".join([
        f"<div class='card-row'><span class='label'>Donor:</span><span class='value'>{d['name']} ({d['blood_group']})</span></div>\n"
        f"<div class='card-row'><span class='label'>Contact:</span><span class='value'>{d['phone']}</span></div>" for d in donor_list
    ])

    content = f"""
    <p>Hello,</p>
    <p>Your blood request has been fully fulfilled. The following donor(s) have confirmed and secured the donation:</p>
    <div class="card">
        <h3 class="card-title">Fulfillment Summary</h3>
        <div class="card-row">
            <span class="label">Request ID:</span>
            <span class="value">#{request_id}</span>
        </div>
        <div class="card-row">
            <span class="label">Hospital:</span>
            <span class="value">{hospital}</span>
        </div>
        <div class="card-row">
            <span class="label">Blood Group:</span>
            <span class="value">{blood_group}</span>
        </div>
        <div class="card-row">
            <span class="label">Units Required:</span>
            <span class="value">{units_required}</span>
        </div>
        {donor_rows}
    </div>
    <p>Thank you for using RedLine AI Dispatcher. We will follow up soon to verify the donation attendance.</p>
    """

    html = get_base_html_template(subject, content)
    return send_html_email(requester_email, subject, html)


def schedule_post_donation_verification(request_id: int, donor_id: int, donor_email: str, donor_name: str, requester_email: str, delay_minutes: int = 60) -> None:
    """Schedule donor/requester verification emails after the configured delay."""
    def send_verification_emails():
        send_donor_verification_email(
            donor_email=donor_email,
            donor_name=donor_name,
            request_id=request_id,
            donor_id=donor_id,
        )
        send_requester_verification_email(
            requester_email=requester_email,
            request_id=request_id,
            donor_id=donor_id,
            donor_name=donor_name,
        )

    timer = threading.Timer(delay_minutes * 60, send_verification_emails)
    timer.daemon = True
    timer.start()


def send_donor_verification_email(donor_email: str, donor_name: str, request_id: int, donor_id: int) -> bool:
    """Sends a verification email 24h post-donation to confirm completion."""
    subject = f"🩸 Did you complete your donation, {donor_name}?"
    
    yes_link = f"{BASE_API_URL}/api/interactions/verification-response?actor=Donor&status=Completed&request_id={request_id}&donor_id={donor_id}"
    no_link = f"{BASE_API_URL}/api/interactions/verification-response?actor=Donor&status=Failed&request_id={request_id}&donor_id={donor_id}"
    
    content = f"""
    <p>Hello <strong>{donor_name}</strong>,</p>
    <p>Thank you for volunteering to donate blood for Request #{request_id}. To update our records and ensure the patient received the blood, please confirm if you successfully completed the donation yesterday.</p>
    
    <div class="btn-group">
        <a href="{yes_link}" class="btn btn-primary">Yes, I donated</a>
        <a href="{no_link}" class="btn btn-secondary">No, I couldn't donate</a>
    </div>
    """
    
    html = get_base_html_template(subject, content)
    return send_html_email(donor_email, subject, html)

def send_requester_verification_email(requester_email: str, request_id: int, donor_id: int, donor_name: str) -> bool:
    """Sends verification to the requester to confirm if the donor actually showed up."""
    subject = f"🩸 Verify Donation for Request #{request_id}"
    
    yes_link = f"{BASE_API_URL}/api/interactions/verification-response?actor=Requester&status=Completed&request_id={request_id}&donor_id={donor_id}"
    no_link = f"{BASE_API_URL}/api/interactions/verification-response?actor=Requester&status=Failed&request_id={request_id}&donor_id={donor_id}"
    
    content = f"""
    <p>Hello,</p>
    <p>To update the donor profile and ensure accuracy, please confirm if <strong>{donor_name}</strong> successfully completed their blood donation for your request.</p>
    
    <div class="btn-group">
        <a href="{yes_link}" class="btn btn-primary">Yes, they donated</a>
        <a href="{no_link}" class="btn btn-secondary">No, they did not show up</a>
    </div>
    """
    
    html = get_base_html_template(subject, content)
    return send_html_email(requester_email, subject, html)
