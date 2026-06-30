"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Shield,
  Zap,
  Clock,
  MapPin,
  TrendingUp,
  Bot,
  Send,
  Plus,
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  Settings,
  MessageSquare,
  Share2,
  FileText,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { createRequest, sendChatMessage } from "@/lib/api";
import type { BloodRequestCreate } from "@/lib/types";

// Simulated live logs for landing page preview
const SIMULATED_LOGS = [
  { agent: "intake_agent", message: "Extracted O- request for Indus Hospital. Patient ID: PT-9921", time: "Just now" },
  { agent: "matcher_agent", message: "Matched 5 compatible O- donors in Korangi area.", time: "1 min ago" },
  { agent: "outreach_agent", message: "Dispatched Wave 1 WhatsApp outreach to matched donors.", time: "1 min ago" },
  { agent: "system", message: "Donor Faisal Shah accepted Indus Hospital request. Progress: 1/2 units.", time: "2 mins ago" },
  { agent: "intake_agent", message: "Received emergency B+ request for DHA Clinic.", time: "4 mins ago" },
  { agent: "matcher_agent", message: "Matched 12 compatible B+ / O+ donors within 8km.", time: "4 mins ago" },
  { agent: "outreach_agent", message: "Wave 1 outreach sent to 3 primary candidates.", time: "3 mins ago" },
  { agent: "system", message: "Request #11 fully fulfilled. Coordinator notified.", time: "5 mins ago" },
];

export default function LandingPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "form">("chat");

  // Form state
  const [patientId, setPatientId] = useState("");
  const [hospital, setHospital] = useState("Indus Hospital");
  const [bloodGroup, setBloodGroup] = useState("O-");
  const [units, setUnits] = useState(1);
  const [urgency, setUrgency] = useState("High");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState<{ id: number; patient_id: string } | null>(null);


  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am the BloodLink AI Coordinator. I can help you file an emergency blood request immediately. \n\nTo begin, please tell me: \n1. Patient's Name or ID\n2. Blood Group needed\n3. Hospital Location\n4. Urgency Level (Critical, High, Medium, Low)\n5. Email or Phone for notifications",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatEmail, setChatEmail] = useState("");
  const [chatSuccessId, setChatSuccessId] = useState<number | null>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);  // save session ID to send on next time

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Live system activity ticker simulator
  const [tickerLogs, setTickerLogs] = useState(SIMULATED_LOGS.slice(0, 4));
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerLogs((prev) => {
        const nextIndex = (SIMULATED_LOGS.length + prev.length) % SIMULATED_LOGS.length;
        const nextItem = {
          ...SIMULATED_LOGS[nextIndex],
          time: "Just now",
        };
        // shift other times
        const updatedPrev = prev.map((log) => {
          if (log.time === "Just now") return { ...log, time: "1 min ago" };
          if (log.time === "1 min ago") return { ...log, time: "2 mins ago" };
          return { ...log, time: "3 mins ago" };
        });
        return [nextItem, ...updatedPrev.slice(0, 3)];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Submit Traditional Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId || !hospital || !email) {
      setFormError(
        "Patient ID, hospital and email are required."
      );
      return;
    }

    setFormSubmitting(true);
    setFormError("");
    try {
      const data: BloodRequestCreate = {
        patient_id: patientId,
        hospital,
        blood_group: bloodGroup,
        units_required: units,
        urgency,
      };
      const created = await createRequest(data, email);
      setFormSuccess({ id: created.id, patient_id: created.patient_id });
    } catch (err: any) {
      setFormError(err.message || "Failed to submit blood request. Try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Chat Message
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatEmail.trim()) return;

    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await sendChatMessage({
        message: userText,
        email: chatEmail.trim(),
        sessionId: currentSessionId || undefined, // Send current session if exists
      });

      setChatMessages((prev) => [...prev, { sender: "ai", text: res.reply }]);

      // Save the session ID returned by the backend for subsequent messages
      if (res.sessionId) {
        setCurrentSessionId(res.sessionId);
      }

      const idMatch = res.reply.match(/(?:request\s*#?|#)(\d+)/i);
      if (idMatch && idMatch[1]) {
        setChatSuccessId(parseInt(idMatch[1], 10));
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: "I ran into a server error processing that request." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const resetForm = () => {
    setPatientId("");
    setHospital("Indus Hospital");
    setBloodGroup("O-");
    setUnits(1);
    setUrgency("High");
    setEmail("");
    setPhone("");
    setNotes("");
    setFormSuccess(null);
    setFormError("");
  };

  const resetChat = () => {
    setChatMessages([
      {
        sender: "ai",
        text: "Hello! I am the BloodLink AI Coordinator. I can help you file an emergency blood request immediately. \n\nTo begin, please tell me: \n1. Patient's Name or ID\n2. Blood Group needed\n3. Hospital Location\n4. Urgency Level (Critical, High, Medium, Low)\n5. Email or Phone for notifications",
      },
    ]);
    setChatSuccessId(null);
    setChatEmail("");
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none antialiased">
      {/* 1. NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="blood drop">🩸</span>
          <span className="font-semibold text-foreground tracking-tight text-base">
            BloodLink AI
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-muted-foreground">
          <a href="#hero" className="hover:text-foreground transition-colors">Home</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#live-preview" className="hover:text-foreground transition-colors">Live Preview</a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="h-8 px-3 border border-border bg-card text-xs font-medium rounded hover:bg-muted/40 transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Operator Panel</span>
          </Link>
          <button
            onClick={() => {
              resetForm();
              resetChat();
              setModalOpen(true);
            }}
            className="h-8 px-3.5 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded transition-colors shadow-sm"
          >
            Request Blood
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section id="hero" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 text-primary text-[10px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Driven Coordination Command</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
            AI-Powered Emergency <br className="hidden sm:inline" />
            <span className="text-primary">Blood Donation</span> Coordination
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            BloodLink AI connects hospitals with eligible, close-proximity donors in real-time. Our specialized multi-agent system automates compatible matching, wave-based outreaches, and simulator analytics, replacing slow manual phone trees when minutes save lives.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => {
                resetForm();
                resetChat();
                setModalOpen(true);
              }}
              className="h-10 px-5 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow"
            >
              <span>Request Blood Immediately</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="#how-it-works"
              className="h-10 px-5 border border-border bg-card hover:bg-muted/40 text-foreground text-xs font-semibold rounded flex items-center justify-center transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Hero Right: Mock Dashboard UI Preview */}
        <div className="lg:col-span-6 border border-border bg-card rounded-xl p-4 sm:p-5 shadow-lg relative group transition-colors duration-200">
          <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">OUTREACH COMMAND CENTRE</span>
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="w-2 h-2 rounded-full bg-border" />
            </div>
          </div>

          <div className="space-y-4">
            {/* Mock Stat Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background border border-border p-2.5 rounded-lg">
                <span className="text-[9px] text-muted-foreground uppercase font-semibold block tracking-wider">Active Waves</span>
                <span className="text-base font-bold text-foreground font-mono">3 / 3</span>
              </div>
              <div className="bg-background border border-border p-2.5 rounded-lg">
                <span className="text-[9px] text-muted-foreground uppercase font-semibold block tracking-wider">Secured</span>
                <span className="text-base font-bold text-success font-mono">82%</span>
              </div>
              <div className="bg-background border border-border p-2.5 rounded-lg">
                <span className="text-[9px] text-muted-foreground uppercase font-semibold block tracking-wider">Avg Time</span>
                <span className="text-base font-bold text-foreground font-mono">4.2m</span>
              </div>
            </div>

            {/* Mock Timeline Progress Request */}
            <div className="border border-border rounded-lg p-3 bg-background space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Request #294 (O- Emergency)</span>
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">CRITICAL</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full w-2/3" />
              </div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                <span>Location: Indus Hospital</span>
                <span>2 of 3 units secured</span>
              </div>
            </div>

            {/* Mock AI Agent Audit logs */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">AI Orchestrator Stream</span>
              <div className="divide-y divide-border/60 bg-background border border-border rounded-lg text-[10px] font-mono p-2 space-y-1">
                <p className="text-foreground"><span className="text-primary">intake_agent:</span> Created Blood Request #294 for patient PT-8201.</p>
                <p className="text-foreground"><span className="text-primary">matcher_agent:</span> Searched 5km radius around Indus Hospital. Match score: 98%.</p>
                <p className="text-foreground"><span className="text-primary">outreach_agent:</span> Wave 1 SMS notifications dispatched to 3 compatible O- donors.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 bg-background/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center">
          <div className="space-y-3 mb-12">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">coordination workflow</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              How the Dispatch System Operates
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Our automated intake and agent routing pipeline works in four clinical phases to secure blood units.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Submit a Request", desc: "Coordinator files emergency patient details via form or AI bot conversation." },
              { step: "02", title: "AI Matches Eligible Donors", desc: "Matcher agent filters blood group compatibility and ranks nearest available donors." },
              { step: "03", title: "Instant Notifications", desc: "Outreach agent triggers WhatsApp / Email alerts in calculated, response-timeout waves." },
              { step: "04", title: "Request Fulfilled", desc: "Acceptances are logged, progress bars update live, and emergency transport is dispatched." },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-lg p-5 text-left shadow-sm hover:border-primary/40 transition-colors"
              >
                <span className="font-mono text-xl font-bold text-primary block mb-3">{item.step}</span>
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. KEY FEATURES */}
      <section id="features" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center">
          <div className="space-y-3 mb-12">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">platform capabilities</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Engineered for Operator Speed & Safety
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Equipped with a rich stack of emergency agent utilities and real-time dashboard tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Heart, title: "AI Proximity Donor Matching", desc: "Calculates geographical distance between Karachi landmarks and donor registry to sort candidates." },
              { icon: Zap, title: "Wave-Based Outreach", desc: "Contacts donors sequentially in batches based on custom setting multipliers, reducing communication congestion." },
              { icon: Activity, title: "Live Request Timeline", desc: "Detailed operator telemetry panel mapping out exact outreach wave logs, acceptances, and audit histories." },
              { icon: Mail, title: "WhatsApp & Email Dispatches", desc: "Automated direct integrations sending notifications, accept/decline links, and tracking updates." },
              { icon: Shield, title: "Operator Command Panel", desc: "Fast, dense command center inspired by Linear UI guidelines, built to display telemetry under pressure." },
              { icon: TrendingUp, title: "Smart Demand Analytics", desc: "Muted-axes Recharts layouts visualising demand by hospital distribution, blood groups, and agent logs." },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-lg p-5 text-left shadow-sm hover:border-primary/40 transition-colors flex gap-4"
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-4.5 h-4.5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. LIVE SYSTEM PREVIEW */}
      <section id="live-preview" className="py-16 bg-background/50 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 space-y-4 text-left">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">live console telemetry</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-[1.1]">
                Real-Time System Dispatch Feed
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Observe the live activity ticker below. The platform automates background task checking, updates progress values, and issues system-wide alerts.
              </p>
              <div className="border border-border bg-card p-4 rounded-lg space-y-3 shadow-sm">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Simulation Speed</span>
                  <span className="font-mono font-semibold text-primary">Active</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Outreach Success Rate</span>
                  <span className="font-mono font-semibold text-success">92.4%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Fulfillment Score</span>
                  <span className="font-mono font-semibold">98.8%</span>
                </div>
              </div>
            </div>

            {/* Live Ticker Feed */}
            <div className="lg:col-span-8 border border-border bg-card rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Coordination Ticker Logs</h3>
                </div>
                <span className="text-[9px] bg-success/10 text-success px-2 py-0.5 rounded-full font-semibold animate-pulse">
                  System Listening
                </span>
              </div>

              <div className="space-y-2.5 transition-all">
                {tickerLogs.map((log, idx) => {
                  let badgeColor = "bg-muted text-muted-foreground";
                  let agentLabel = log.agent;
                  if (log.agent === "intake_agent") {
                    badgeColor = "bg-primary/10 text-primary";
                    agentLabel = "INTAKE";
                  } else if (log.agent === "matcher_agent") {
                    badgeColor = "bg-warning/10 text-warning";
                    agentLabel = "MATCHER";
                  } else if (log.agent === "outreach_agent") {
                    badgeColor = "bg-success/10 text-success";
                    agentLabel = "OUTREACH";
                  } else if (log.agent === "system") {
                    badgeColor = "bg-border text-foreground font-semibold";
                    agentLabel = "DISPATCH";
                  }

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-background border border-border/80 rounded-lg flex items-center justify-between text-xs animate-fade-in group hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider ${badgeColor}`}>
                          {agentLabel}
                        </span>
                        <span className="font-medium text-foreground text-left">{log.message}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-3">{log.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL-TO-ACTION SECTION */}
      <section className="py-16 px-4 bg-background border-t border-border">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Initiate An Emergency Request Now
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            If a patient requires emergency blood support, click below to start either an interactive chat intake with our coordinator agent or fill out a traditional request form.
          </p>
          <button
            onClick={() => {
              resetForm();
              resetChat();
              setModalOpen(true);
            }}
            className="h-10 px-6 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded inline-flex items-center gap-2 transition-colors shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Request Emergency Blood Link</span>
          </button>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-card border-t border-border mt-auto py-10 px-4 sm:px-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg" role="img" aria-label="blood drop">🩸</span>
              <span className="font-semibold text-foreground tracking-tight text-sm">
                BloodLink AI
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Autonomous multi-agent system for coordinate-matched donor search and sequential wave outreaches. Designed for clinical dispatch speed and reliability.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-[11px] uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#hero" className="hover:text-foreground">Hero Panel</a></li>
              <li><a href="#how-it-works" className="hover:text-foreground">Workflow Details</a></li>
              <li><a href="#features" className="hover:text-foreground">System Features</a></li>
              <li><a href="#live-preview" className="hover:text-foreground">Live Telemetry</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-[11px] uppercase tracking-wider">Control Center</h4>
            <ul className="space-y-2">
              <li><Link href="/dashboard" className="hover:text-foreground flex items-center gap-1">Command Console <ChevronRight className="w-3 h-3" /></Link></li>
              <li><Link href="/requests" className="hover:text-foreground">Active Dispatches</Link></li>
              <li><Link href="/donors" className="hover:text-foreground">Donor Database</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-[11px] uppercase tracking-wider">Contact & Info</h4>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>Emergency Support:</li>
              <li className="text-foreground font-semibold">+92 (21) 111-BLOOD</li>
              <li>Email Coordinator:</li>
              <li className="text-foreground font-semibold">dispatch@bloodlink.ai</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-border/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 BloodLink AI. All rights reserved. Built for intensive emergency coordination.</p>
          <div className="flex gap-4">
            <span className="text-[10px] text-muted-foreground font-mono">v1.2.0 (Stable)</span>
          </div>
        </div>
      </footer>

      {/* REQUEST BLOOD FLOW MODAL DIALOG */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/15">
              <div className="flex items-center gap-2">
                <Heart className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">File Blood Request</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Forms / Chats */}
            {formSuccess ? (
              /* Success Panel */
              <div className="p-6 text-center space-y-4 overflow-y-auto">
                <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center text-success mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Emergency Request Created Successfully</h4>
                  <p className="text-xs text-muted-foreground">
                    Our AI agents are analyzing compatible donors and preparing Wave 1 outreach coordinates.
                  </p>
                </div>

                <div className="bg-background border border-border rounded-lg p-4 max-w-xs mx-auto space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">Request ID:</span>
                    <span className="font-bold text-primary">#{formSuccess.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">Patient:</span>
                    <span className="font-bold text-foreground">{formSuccess.patient_id}</span>
                  </div>
                  {email && (
                    <div className="text-[10px] text-muted-foreground text-center border-t border-border pt-1.5">
                      Progress reports will be sent to <span className="font-semibold">{email}</span>.
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      setModalOpen(false);
                      router.push(`/requests/${formSuccess.id}`);
                    }}
                    className="h-9 px-4 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Track Dispatch Real-Time</span>
                  </button>
                  <button
                    onClick={() => {
                      resetForm();
                      resetChat();
                    }}
                    className="h-9 px-4 border border-border text-foreground hover:bg-muted/40 text-xs font-medium rounded transition-colors"
                  >
                    File Another Request
                  </button>
                </div>
              </div>
            ) : (
              /* Active Intake Tab Flow */
              <>
                {/* Tabs selection */}
                <div className="border-b border-border bg-background flex text-xs">
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex-1 py-3 text-center font-semibold transition-all relative ${activeTab === "chat"
                      ? "text-primary bg-card"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/15"
                      }`}
                  >
                    {activeTab === "chat" && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Chat Mode (AI Intake)</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("form")}
                    className={`flex-1 py-3 text-center font-semibold transition-all relative ${activeTab === "form"
                      ? "text-primary bg-card"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/15"
                      }`}
                  >
                    {activeTab === "form" && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Form Mode (Manual)</span>
                    </span>
                  </button>
                </div>

                {activeTab === "chat" ? (
                  /* Chat mode UI */
                  <div className="flex-1 flex flex-col overflow-hidden min-h-[360px]">
                    {/* Chat log wrapper */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                            }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${msg.sender === "user" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                              }`}
                          >
                            {msg.sender === "user" ? "OP" : <Bot className="w-4 h-4" />}
                          </div>
                          <div
                            className={`p-3 rounded-lg text-xs leading-relaxed text-left whitespace-pre-line ${msg.sender === "user"
                              ? "bg-primary text-white"
                              : "bg-background border border-border text-foreground"
                              }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex gap-3 max-w-[80%] mr-auto">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 animate-pulse">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="p-3 rounded-lg text-xs bg-background border border-border text-muted-foreground flex items-center gap-1.5 font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                            Intake Agent analyzing...
                          </div>
                        </div>
                      )}

                      {chatSuccessId && (
                        <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center space-y-3 mt-4 animate-fade-in">
                          <div className="flex items-center justify-center gap-1.5 text-success font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Request Dispatched!</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            I have parsed your details and logged request <span className="font-bold">#{chatSuccessId}</span> into the database.
                          </p>
                          <button
                            onClick={() => {
                              setModalOpen(false);
                              router.push(`/requests/${chatSuccessId}`);
                            }}
                            className="h-8 px-4 bg-success hover:bg-success/90 text-white text-xs font-semibold rounded transition-colors shadow-sm mx-auto flex items-center gap-1.5"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Track Live Link</span>
                          </button>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat footer input */}
                    <form onSubmit={handleChatSend} className="p-3 border-t border-border bg-background flex flex-col gap-2">
                      {/* Row 1: Required Email Field */}
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="chat-email" className="text-[10px] font-semibold text-destructive uppercase tracking-wider">
                          Sender Email *
                        </label>
                        <input
                          id="chat-email"
                          type="email"
                          required
                          placeholder="your-email@example.com"
                          value={chatEmail}
                          onChange={(e) => setChatEmail(e.target.value)}
                          disabled={chatLoading || chatSuccessId !== null}
                          className="flex-1 h-6 px-2 bg-muted/40 border border-border focus:border-destructive/50 rounded text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Row 2: Main Prompt Action Area */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type details (e.g. O- patient PT-82 for Indus Hospital, 2 units)..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={chatLoading || chatSuccessId !== null}
                          className="flex-1 h-9 pl-3 pr-3 bg-card border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={chatLoading || chatSuccessId !== null || !chatInput.trim() || !chatEmail.trim()}
                          className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/95 text-white rounded-md flex items-center justify-center transition-colors disabled:opacity-40"
                          aria-label="Send message"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>

                  </div>
                ) : (
                  /* Form mode UI */
                  <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                    {formError && (
                      <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-[11px] rounded font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Patient Name / ID */}
                    <div className="space-y-1 text-left">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Patient Name / ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Zainab Bibi"
                        required
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    {/* Contact Email & Phone */}
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="operator@system.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          placeholder="+923001234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>

                    {/* Hospital & Blood Group */}
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Hospital Location
                        </label>
                        <select
                          required
                          value={hospital}
                          onChange={(e) => setHospital(e.target.value)}
                          className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50"
                        >
                          <option value="Indus Hospital">Indus Hospital</option>
                          <option value="Civil Hospital">Civil Hospital</option>
                          <option value="Gulshan-e-Iqbal">Gulshan-e-Iqbal</option>
                          <option value="North Nazimabad">North Nazimabad</option>
                          <option value="DHA">DHA</option>
                          <option value="Korangi">Korangi</option>
                          <option value="Clifton">Clifton</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Blood Group
                        </label>
                        <select
                          required
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 font-bold"
                        >
                          {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((g) => (
                            <option key={g} value={g}>
                              {g} Group
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Units & Urgency */}
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Units Required
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          value={units}
                          onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                          className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Urgency Level
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {["Low", "Medium", "High", "Critical"].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setUrgency(lvl)}
                              className={`h-9 text-[10px] font-semibold rounded-md border transition-all ${urgency === lvl
                                ? "bg-primary text-white border-primary"
                                : "bg-background text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
                                }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-1 text-left">
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Additional Notes / Symptoms
                      </label>
                      <textarea
                        placeholder="e.g. Dengue patient, platelets required, urgent bypass surgery..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="h-9 px-4 font-semibold border border-border text-foreground hover:bg-muted/40 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formSubmitting}
                        className="h-9 px-4 bg-primary hover:bg-primary/95 text-white font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Submit Request</span>
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
