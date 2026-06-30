import os
from uuid import uuid4
from typing import AsyncGenerator
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types
from google.adk.models.lite_llm import LiteLlm

from dotenv import load_dotenv
load_dotenv()

# Import tools directly from our MCP tools modulelo
from app.mcp_server import (
    create_blood_request,
    search_donors,
    log_timeline_event,
    log_ai_activity,
    send_outreach_email,
    send_whatsapp_outreach,
    get_system_settings
)

# Reuse the model configurations from the template
# GEMINI_MODEL = Gemini(
#     model="gemini-2.5-flash",
#     retry_options=types.HttpRetryOptions(attempts=3),
# )

# GEMINI_MODEL = LiteLlm(
#     model="openai/gpt-oss-120b:free",  # Replace with any OpenRouter model identifier
#     api_key=os.getenv("OPENROUTER_API_KEY"),
#     api_base="https://openrouter.ai/api/v1"
# )


GEMINI_MODEL = LiteLlm(
    model="cohere/command-a-03-2025"
)

# GEMINI_MODEL = LiteLlm(
#     model="openai/qwen",
#     api_base="https://compactly-excursion-fog.ngrok-free.dev",
#     api_key="fake-key"
# )


# 1. Intake Agent - extracts details and creates requests
intake_agent = Agent(
    name="intake_agent",
    model=GEMINI_MODEL,
    instruction="""
    You are the Intake Agent. Your job is to process incoming blood requests from users.
    1. Parse the user's message to extract the patient ID (generate one like PT-XXXXX if not present), blood group needed (e.g. O-, B+), hospital name, number of units required, requester_email, and urgency/urgency level (Critical, High, Medium, Low).
    2. Use the requester email from the provided user context if the user did not explicitly supply it in the message.
    3. If the email is available in the chat request, preserve it and use it for confirmation/tracking notification.
    4. If any required field is missing, ask the user for the missing information clearly and directly; do not ask the user to "transfer" or to confirm handoff.
    5. Only call `create_blood_request` when all required details are present.
    6. After calling `create_blood_request`, return a short confirmation message and log your action using `log_ai_activity`.
    """,
    tools=[create_blood_request, log_ai_activity],
)

# 2. Matcher Agent - finds compatible donors
matcher_agent = Agent(
    name="matcher_agent",
    model=GEMINI_MODEL,
    instruction="""
    You are the Matcher Agent. Your job is to find eligible compatible blood donors.
    1. Call the `search_donors` tool using the recipient's required blood group and the hospital location.
    2. Rank the matching donors by location proximity (handled automatically by the tool).
    3. Log your matching activity using `log_ai_activity` explaining how many donors were matched.
    4. Log a timeline event for the request using `log_timeline_event` indicating donors were ranked.
    """,
    tools=[search_donors, log_timeline_event, log_ai_activity],
)

# 3. Outreach Agent - triggers wave-based emails and WhatsApp
outreach_agent = Agent(
    name="outreach_agent",
    model=GEMINI_MODEL,
    instruction="""
    You are the Outreach Agent. Your job is to contact matched donors in waves.
    1. Read the system settings using `get_system_settings` to find the wave size multiplier and maximum wave parameters.
    2. Query eligible donors using `search_donors` for the request blood group and hospital location.
    3. Select donors for the current wave using the wave size and urgency rules.
    4. For each selected donor, call `send_outreach_email` and `send_whatsapp_outreach`.
    5. Log your wave launch actions using `log_ai_activity` and `log_timeline_event`.
    6. If there are not enough matched donors, escalate the request by writing a timeline event and recommending a follow-up wave or escalation to Critical.
    """,
    tools=[search_donors, send_outreach_email, send_whatsapp_outreach, get_system_settings, log_timeline_event, log_ai_activity],
)

# 4. Conversation Agent - communicates progress
conversation_agent = Agent(
    name="conversation_agent",
    model=GEMINI_MODEL,
    instruction="""
    You are the Conversation Agent. Your job is to keep the requester informed of status updates.
    1. Summarize the progress clearly (e.g. 'Intake complete', 'Wave 1 launched', '2 units secured').
    2. If any required fields are missing from the request, ask the user for those details.
    3. Log timeline events to the request details using `log_timeline_event`.
    4. Log your activities using `log_ai_activity`.
    5. Keep the conversation alive until the requester has all missing fields or you have confirmed the next action.
    """,
    tools=[log_timeline_event, log_ai_activity],
)

# 5. Root Orchestrator Agent - coordinates routing
root_agent = Agent(
    name="root_agent",
    model=GEMINI_MODEL,
    instruction="""
    You are the Root Agent, the primary coordinator for the RedLine AI Blood Donation Dispatcher.
    Your goal is to coordinate the intake, matching, outreach, and update workflow.
    
    1. When a user submits a blood request or follows up with request details, automatically route the message to the `intake_agent` first.
    2. Do not ask the user whether they want to transfer to intake. Handle all intake routing internally.
    3. Do not create or save a request until all required details are present: requester email, blood group, hospital location, units needed, and urgency.
    4. If any required information is missing, let the `intake_agent` ask only for the missing fields and keep the conversation open.
    5. Once `intake_agent` creates the request successfully, immediately route to the `matcher_agent` to find compatible donors.
    6. After matching donors, route to the `outreach_agent` to launch Wave 1 outreach.
    7. Finally, route to the `conversation_agent` and provide the requester a clear progress update and the request ID.
    8. If the user already has all required information, proceed without extra handoff prompts.
    9. Always include the requested blood group, units, hospital, and estimated next step in the response.
    """,
    sub_agents=[intake_agent, matcher_agent, outreach_agent, conversation_agent],
)

# Define the Google ADK App container
app_container = App(
    root_agent=root_agent,
    name="app",
)

# --- Coordination Runner Helper ---
from google.adk.sessions import InMemorySessionService
chat_session_service = InMemorySessionService()

# async def process_chat_message(user_message: str, user_email: str, session_id: str) -> str:
#     from google.adk.runners import InMemoryRunner
#     from google.genai import types
    
#     # 2. Instantiate your runner
#     runner = InMemoryRunner(agent=root_agent, app_name="BloodIntakeApp")
    
#     # 3. PATCH THE RUNNER: Explicitly enforce the shared session tracking manager
#     runner.session_service = chat_session_service
    
#     # 4. Programmatically initialize the session block within this service
#     await chat_session_service.create_session(
#         app_name="BloodIntakeApp",
#         user_id=user_email,
#         session_id=session_id
#     )
    
#     # 5. Structure your Content input payload safely
#     context_text = f"User Identity (Email): {user_email}\nMessage Context: {user_message}"
#     formatted_message = types.Content(
#         role="user",
#         parts=[types.Part.from_text(text=context_text)]
#     )
    
#     response_text = ""
    
#     # 6. Execute loop stream safely
#     async for event in runner.run_async(
#         new_message=formatted_message,
#         session_id=session_id,
#         user_id=user_email
#     ):
#         if event.content:
#             for part in event.content.parts:
#                 if hasattr(part, "text") and part.text:
#                     response_text += part.text
#                 elif isinstance(part, str):
#                     response_text += part
    
#     if response_text.strip():
#         return response_text.strip()
#     return "I processed your request. If any details are missing, please provide the blood group, hospital, units needed, or urgency so I can continue."


async def process_chat_message(user_message: str, user_email: str, session_id: str) -> str:
    from google.adk.runners import InMemoryRunner
    from google.genai import types
    
    runner = InMemoryRunner(agent=root_agent, app_name="BloodIntakeApp")
    runner.session_service = chat_session_service
    
    # FIX: Check if the session already exists in the memory service
    # If the SDK doesn't expose `has_session`, a try/except block safely catches it.
    try:
        await chat_session_service.create_session(
            app_name="BloodIntakeApp",
            user_id=user_email,
            session_id=session_id
        )
    except Exception:
        # Session already exists in memory block, skip creation step safely
        pass
    
    context_text = (
        f"Requester Email: {user_email}\n"
        f"Message Context: {user_message}\n"
        f"Use the requester email from this chat context when creating or confirming the request."
    )
    formatted_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=context_text)]
    )
    
    response_text = ""
    async for event in runner.run_async(
        new_message=formatted_message,
        session_id=session_id,
        user_id=user_email
    ):
        if event.content:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    response_text += part.text
                elif isinstance(part, str):
                    response_text += part

    if response_text.strip():
        return response_text.strip()

    email_note = (
        f" A confirmation email will be sent to {user_email} once the request is created."
        if user_email
        else " A confirmation email will be sent once the request is created."
    )

    return (
        "Thanks! I processed your input. "
        "If anything is missing, please provide the blood group, hospital, units needed, or urgency so I can continue."
        f"{email_note}"
    )



