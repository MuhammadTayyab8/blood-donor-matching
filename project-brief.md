Absolutely. I think your project can be summarized into **three major modules**:

1. **Request Management**
2. **AI Agent Orchestration**
3. **Donor Coordination & Tracking**

---

# 🩸 AI Blood Donation Coordination System

## Project Summary

An AI-powered blood donation coordination platform that automatically manages emergency blood requests using multiple AI agents. Instead of manually calling donors, the system intelligently finds eligible donors, contacts them in waves through WhatsApp and email, tracks their responses, keeps the requester informed in real time, and verifies whether the donation was successfully completed.

The project consists of a **public-facing website**, an **operator dashboard**, and an **AI backend powered by Google ADK and MCP tools**.

---

# Frontend Scope

## Public Website

Purpose:
Allow anyone to request blood quickly.

Features:

* Modern landing page
* AI Chat Request
* Blood Request Form
* Request Success Page
* Public Request Tracking Page (via email link)

---

## Operator Dashboard

Purpose:
Monitor and manage the complete donation workflow.

Modules:

### Dashboard

* KPI Cards
* Analytics
* Emergency Requests
* Recent Notifications
* AI Summary

---

### Blood Requests

* View Requests
* Search
* Filters
* Request Details
* Manual Escalation

---

### Request Detail

* Progress
* Timeline
* Donor Status
* Outreach Waves
* AI Insights
* Operator Actions

---

### Donor Management

* Search Donors
* Donor Profiles
* Donation History
* Availability

---

### AI Activity

View every action performed by AI agents.

---

### Notifications

Centralized notification center.

---

### Settings

Configure:

* Wave Multiplier
* Maximum Waves
* Follow-up Delay
* Matching Rules
* Contact Preferences

---

# Backend Scope

## REST APIs

Provide APIs for:

* Dashboard
* Blood Requests
* Donors
* Notifications
* AI Activity
* Analytics
* Settings

---

## MCP Server

Expose tools for AI agents.

Examples:

* Search Donors
* Update Request
* Create Notifications
* Send Email
* Send WhatsApp
* Fetch Analytics

---

## AI Agents

### Root Agent

Coordinates the complete workflow.

---

### Intake Agent

* Validate request
* Determine urgency
* Create request

---

### Matcher Agent

Find compatible donors using:

* Blood Group
* Distance
* Availability
* Eligibility

---

### Outreach Agent

Launch donor outreach waves.

Responsible for:

* Email
* WhatsApp
* Follow-up
* Escalation

---

### Conversation Agent

Communicates with:

* Requester
* Donors

Provides live status updates.

---

# End-to-End Flow

```text
                    🩸 USER NEEDS BLOOD
                           │
                           ▼
      ┌─────────────────────────────────────┐
      │ Public Website                      │
      │ • AI Chat                           │
      │ • Request Form                      │
      └─────────────────────────────────────┘
                           │
                           ▼
                📩 Create Blood Request
                           │
                           ▼
                 🧠 Root Agent (Orchestrator)
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   Intake Agent     Matcher Agent    Conversation Agent
   🟦 Validate       🟩 Find Donors   🟪 Send Updates
   🟦 Save Request   🟩 Rank Donors   🟪 Notify Requester
          │                │
          └────────────┬───┘
                       ▼
             MCP Server (Tools Layer)
        ┌─────────────────────────────────┐
        │ 🗄️ NeonDB                       │
        │ 📧 Email Tool                   │
        │ 💬 WhatsApp Tool                │
        │ 🔔 Notification Tool            │
        │ 📊 Analytics Tool               │
        └─────────────────────────────────┘
                       │
                       ▼
              📣 Outreach Agent
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
     Wave 1                    Wait for Timeout
 (Contact N Donors)                  │
         │                           │
         ▼                           ▼
  Enough Units? ─────── No ───► Launch Wave 2
         │                           │
        Yes                          ▼
         │                     Launch Wave 3
         ▼
  Required Units Secured
         │
         ▼
Donors Receive Accept / Reject Links
         │
   ┌─────┴─────┐
   ▼           ▼
Accept      Reject
   │           │
   ▼           ▼
Update DB   Continue Outreach
   │
   ▼
Share Donor Details with Requester
   │
   ▼
Donation Completed?
   │
   ▼
24-Hour Verification Email
(Requester + Donor)
   │
   ▼
Verified Donation
   │
   ▼
Update Donor History
Update Analytics
Mark Request Fulfilled
Send Completion Notification
```

---

# Technology Stack

### Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui
* Recharts
* WebSockets

### Backend

* FastAPI
* Google ADK
* Google Agents CLI
* MCP Server
* Neon PostgreSQL
* SQLAlchemy
* APScheduler
* Jinja2
* HTTPX

### AI Architecture

* Root Agent
* Intake Agent
* Matcher Agent
* Outreach Agent
* Conversation Agent

### Communication

* Email
* WhatsApp
* Real-time Notifications (WebSockets)

---

## Core Value Proposition

The system doesn't just help people request blood—it automates the entire coordination process. AI agents intelligently identify eligible donors, contact them in controlled outreach waves, monitor responses, keep all parties informed, verify completed donations, and provide operators with complete real-time visibility through a centralized dashboard. This minimizes manual coordination, reduces response time during emergencies, and creates a transparent, trackable donation workflow from request submission to donation verification.
