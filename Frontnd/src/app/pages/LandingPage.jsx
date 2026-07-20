import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Lock,
  MessageCircle,
  Zap,
  Shield,
  Users,
  ArrowUp,
  ChevronRight,
  CheckCheck,
  Smile,
  CirclePlus,
  SquarePen,
  Search,
  Moon,
  Sun,
} from "lucide-react";

const springDefault = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 };
const springSnappy = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 };

// ── Mock chat messages for the hero preview ──
const mockMessages = [
  { id: 1, sender: "Alice", text: "Hey! Did you see the new design?", time: "10:41 AM", sent: false },
  { id: 2, sender: "Me", text: "Just checked it — looks incredible 🔥", time: "10:42 AM", sent: true },
  { id: 3, sender: "Alice", text: "Right? The glass effects are so smooth", time: "10:42 AM", sent: false },
  { id: 4, sender: "Me", text: "Ship it!", time: "10:43 AM", sent: true },
];

const features = [
  {
    icon: Lock,
    title: "End-to-End Encrypted",
    description: "Every message is encrypted on your device. Not even we can read your conversations.",
    color: "#007AFF",
  },
  {
    icon: Zap,
    title: "Real-Time Messaging",
    description: "Messages arrive instantly over WebSocket connections. No polling, no delays.",
    color: "#34C759",
  },
  {
    icon: Users,
    title: "Group Conversations",
    description: "Create groups for teams, friends, or family. Full E2EE for every member.",
    color: "#FF9F0A",
  },
  {
    icon: Shield,
    title: "Zero Data Collection",
    description: "We store only what's needed to route your messages. No ads, no profiling.",
    color: "#BF5AF2",
  },
  {
    icon: MessageCircle,
    title: "Reactions & Tapbacks",
    description: "React to messages with emoji tapbacks, just like you're used to.",
    color: "#FF375F",
  },
  {
    icon: CheckCheck,
    title: "Read Receipts",
    description: "Know when your message was delivered and seen, with clear visual indicators.",
    color: "#32ADE6",
  },
];

function ChatPreview() {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showSend, setShowSend] = useState(false);

  useEffect(() => {
    mockMessages.forEach((msg, i) => {
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, msg.id]);
      }, 600 + i * 700);
    });
  }, []);

  useEffect(() => {
    setShowSend(inputText.length > 0);
  }, [inputText]);

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ height: 520 }}>
      {/* Phone frame */}
      <div
        className="absolute inset-0 rounded-[44px] overflow-hidden shadow-2xl"
        style={{ background: "#F2F2F7", border: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Chat header */}
        <div
          className="glass flex items-center gap-3 px-4 pt-12 pb-3"
          style={{ borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: "22px", color: "#000" }}>Alice</p>
            <p style={{ fontSize: 12, color: "#34C759", fontWeight: 500 }}>● Online</p>
          </div>
          <Search size={18} strokeWidth={1.75} color="#007AFF" />
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2 px-4 py-3" style={{ paddingBottom: 80 }}>
          {mockMessages.map((msg) =>
            visibleMessages.includes(msg.id) ? (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springSnappy}
                className={`flex flex-col ${msg.sent ? "items-end" : "items-start"}`}
              >
                <div
                  className="px-4 py-2 max-w-[75%]"
                  style={{
                    borderRadius: 18,
                    background: msg.sent ? "#007AFF" : "#E9E9EB",
                    color: msg.sent ? "#fff" : "#000",
                    fontSize: 17,
                    lineHeight: "22px",
                  }}
                >
                  {msg.text}
                </div>
                <div style={{ fontSize: 11, color: "#AEAEB2", marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                  {msg.time}
                  {msg.sent && (
                    <CheckCheck size={11} strokeWidth={1.75} color="#007AFF" style={{ display: "inline", marginLeft: 4 }} />
                  )}
                </div>
              </motion.div>
            ) : null
          )}

          {/* Typing indicator */}
          {visibleMessages.length === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSnappy}
              className="flex items-start"
            >
              <div
                className="px-4 py-3 flex gap-1 items-center"
                style={{ borderRadius: 18, background: "#E9E9EB" }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#8E8E93" }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Compose bar */}
        <div
          className="glass absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-3"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.6)" }}
        >
          <button className="w-8 h-8 flex items-center justify-center" style={{ color: "#007AFF" }}>
            <CirclePlus size={22} strokeWidth={1.75} />
          </button>
          <div
            className="flex-1 flex items-center px-4"
            style={{
              background: "rgba(142,142,147,0.12)",
              borderRadius: 999,
              height: 36,
            }}
          >
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="iMessage"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 17,
                lineHeight: "22px",
                color: "#000",
                width: "100%",
              }}
              className="placeholder:text-muted-foreground"
            />
          </div>
          <motion.button
            animate={{ scale: showSend ? 1 : 0, opacity: showSend ? 1 : 0 }}
            transition={springSnappy}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#007AFF" }}
          >
            <ArrowUp size={16} strokeWidth={2.5} color="#fff" />
          </motion.button>
          {!showSend && (
            <button style={{ color: "#007AFF" }}>
              <Smile size={22} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Notch */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: 120,
          height: 36,
          background: "#000",
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          zIndex: 10,
        }}
      />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...springDefault, delay: index * 0.07 }}
      whileTap={{ scale: 0.97 }}
      className="glass-thick rounded-2xl p-5 flex flex-col gap-3"
      style={{ cursor: "default" }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <Icon size={22} strokeWidth={1.75} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 17, fontWeight: 600, lineHeight: "22px", color: "var(--foreground)", marginBottom: 4 }}>
          {title}
        </p>
        <p style={{ fontSize: 15, lineHeight: "20px", color: "var(--label-secondary)" }}>{description}</p>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Nav ── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        animate={{
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "blur(0px)",
          background: scrolled ? (dark ? "rgba(28,28,30,0.72)" : "rgba(255,255,255,0.72)") : "rgba(0,0,0,0)",
          borderBottomColor: scrolled ? (dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)") : "rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.2 }}
        style={{ background: "rgba(0,0,0,0)", borderBottom: "1px solid rgba(0,0,0,0)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-border/50">
            <img src="/logo-light.png" alt="Cipher" className="h-full w-full object-cover dark:hidden" />
            <img src="/logo-dark.png" alt="Cipher" className="hidden h-full w-full object-cover dark:block" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, color: "var(--foreground)" }}>Cipher</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Security", "Download"].map((item) => (
            <a
              key={item}
              href="#"
              style={{ fontSize: 15, color: "var(--label-secondary)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.target.style.color = "#007AFF")}
              onMouseLeave={(e) => (e.target.style.color = "var(--label-secondary)")}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark(!dark)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--secondary)", color: "var(--label-secondary)" }}
          >
            {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="hidden md:flex items-center gap-2 px-5 h-11 rounded-2xl"
            style={{ background: "#007AFF", color: "#fff", fontWeight: 590, fontSize: 15 }}
          >
            Get Started
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Ambient orbs */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,122,255,0.18) 0%, transparent 70%)",
            top: "-10%",
            left: "60%",
            transform: "translateX(-50%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52,199,89,0.12) 0%, transparent 70%)",
            bottom: "5%",
            left: "10%",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(191,90,242,0.10) 0%, transparent 70%)",
            top: "30%",
            right: "-5%",
            filter: "blur(70px)",
          }}
        />

        <div className="relative z-10 max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left copy */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springDefault, delay: 0.1 }}
            >
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: "rgba(0,122,255,0.1)",
                  color: "#007AFF",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(0,122,255,0.2)",
                }}
              >
                <Lock size={12} strokeWidth={2} />
                End-to-End Encrypted by Default
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springDefault, delay: 0.18 }}
              style={{
                fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 700,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: "var(--foreground)",
              }}
            >
              Messages that stay{" "}
              <span style={{ color: "#007AFF" }}>between you</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springDefault, delay: 0.26 }}
              style={{ fontSize: 17, lineHeight: "28px", color: "var(--label-secondary)", maxWidth: 480 }}
            >
              Cipher is a real-time chat app built around one principle: your conversations are yours.
              With true end-to-end encryption, zero telemetry, and a beautiful interface,
              talking to the people you care about has never felt this private.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springDefault, delay: 0.34 }}
              className="flex flex-wrap gap-3"
            >
              <button
                onClick={() => navigate("/signup")}
                className="flex items-center gap-2 px-7 rounded-2xl"
                style={{
                  background: "#007AFF",
                  color: "#fff",
                  fontWeight: 590,
                  fontSize: 17,
                  height: 50,
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#0062CC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#007AFF")}
              >
                Download for Free
                <ArrowUp size={16} strokeWidth={2.5} style={{ transform: "rotate(45deg)" }} />
              </button>
              <button
                className="flex items-center gap-2 px-7 rounded-2xl"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                  fontWeight: 590,
                  fontSize: 17,
                  height: 50,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                See How It Works
              </button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springDefault, delay: 0.44 }}
              className="flex flex-wrap gap-6 pt-2"
            >
              {[
                { label: "100K+", sub: "Users" },
                { label: "256-bit", sub: "AES-GCM" },
                { label: "0", sub: "Data sold" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)" }}>{stat.label}</span>
                  <span style={{ fontSize: 13, color: "var(--label-secondary)" }}>{stat.sub}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — phone mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...springDefault, delay: 0.3 }}
            className="flex justify-center"
          >
            <ChatPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative px-6 py-24 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springDefault}
            className="text-center mb-14"
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "#007AFF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Everything you need
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
              Built for privacy. Designed for people.
            </h2>
            <p style={{ fontSize: 17, color: "var(--label-secondary)", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
              Every feature was chosen because it makes communication better — not because it helps us collect data.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springDefault}
            className="text-center mb-16"
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "#007AFF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              How it works
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
              Secure by design
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Keys on your device",
                description: "When you sign up, your encryption keys are generated locally. They never leave your device — not during sign-up, not ever.",
                color: "#007AFF",
              },
              {
                step: "02",
                title: "Messages encrypted before sending",
                description: "Every message is encrypted using AES-256-GCM with your recipient's public key before it reaches our servers.",
                color: "#34C759",
              },
              {
                step: "03",
                title: "Only the recipient can read it",
                description: "Our servers relay ciphertext. We literally cannot read your messages — even if compelled to, there's nothing to hand over.",
                color: "#BF5AF2",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...springDefault, delay: i * 0.1 }}
                className="relative glass-thick rounded-2xl p-6"
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: item.color,
                    letterSpacing: "0.06em",
                    display: "block",
                    marginBottom: 16,
                  }}
                >
                  {item.step}
                </span>
                <p style={{ fontSize: 20, fontWeight: 600, lineHeight: "25px", color: "var(--foreground)", marginBottom: 8 }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 15, lineHeight: "20px", color: "var(--label-secondary)" }}>
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sidebar Preview ── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Sidebar mockup */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={springDefault}
              className="order-2 lg:order-1"
            >
              <div
                className="rounded-[28px] overflow-hidden shadow-xl max-w-sm mx-auto"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  height: 480,
                }}
              >
                {/* Sidebar header */}
                <div className="px-4 pt-12 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                      Messages
                    </span>
                    <button style={{ color: "#007AFF" }}>
                      <SquarePen size={22} strokeWidth={1.75} />
                    </button>
                  </div>
                  {/* Search pill */}
                  <div
                    className="flex items-center gap-2 px-4"
                    style={{
                      background: "var(--secondary)",
                      borderRadius: 999,
                      height: 36,
                      marginBottom: 8,
                    }}
                  >
                    <Search size={14} strokeWidth={1.75} color="var(--muted-foreground)" />
                    <span style={{ fontSize: 15, color: "var(--muted-foreground)" }}>Search</span>
                  </div>
                </div>

                {/* Conversation rows */}
                {[
                  { name: "Alice", preview: "Ship it!", time: "Now", unread: 0, color: "from-blue-400 to-purple-500", online: true },
                  { name: "Design Team", preview: "Emily: Uploaded assets 🎨", time: "Yest.", unread: 3, color: "from-orange-400 to-pink-500", online: false },
                  { name: "Bob", preview: "Sounds good to me!", time: "Mon", unread: 0, color: "from-green-400 to-teal-500", online: false },
                  { name: "Family", preview: "Dad: See you Sunday!", time: "Sun", unread: 1, color: "from-yellow-400 to-orange-500", online: false },
                ].map((conv, i) => (
                  <div key={conv.name}>
                    <div
                      className="flex items-center gap-3 px-4"
                      style={{ height: 76, cursor: "pointer" }}
                    >
                      <div className="relative flex-shrink-0">
                        <div className={`w-[50px] h-[50px] rounded-full bg-gradient-to-br ${conv.color} flex items-center justify-center`}>
                          <span style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>{conv.name[0]}</span>
                        </div>
                        {conv.online && (
                          <div
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                            style={{ background: "#34C759", border: "2px solid var(--background)" }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 17, fontWeight: 600, color: "var(--foreground)" }}>{conv.name}</span>
                          <span style={{ fontSize: 12, color: "var(--label-tertiary)" }}>{conv.time}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span
                            style={{ fontSize: 15, color: "var(--label-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}
                          >
                            {conv.preview}
                          </span>
                          {conv.unread > 0 && (
                            <div
                              className="flex items-center justify-center rounded-full"
                              style={{
                                background: "#007AFF",
                                color: "#fff",
                                minWidth: 20,
                                height: 20,
                                fontSize: 11,
                                fontWeight: 500,
                                padding: "0 6px",
                              }}
                            >
                              {conv.unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {i < 3 && (
                      <div style={{ marginLeft: 66, borderBottom: "0.5px solid var(--border)" }} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={springDefault}
              className="order-1 lg:order-2 flex flex-col gap-5"
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "#007AFF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Familiar interface
              </p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                Feels like home. Works everywhere.
              </h2>
              <p style={{ fontSize: 17, lineHeight: "28px", color: "var(--label-secondary)" }}>
                Cipher's interface follows the same spatial logic as the apps you already love —
                so you spend less time learning and more time connecting.
                Available on iOS, Android, and the web.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  "Inset hairline dividers for clean list views",
                  "Large title headers with quick compose access",
                  "Springy, physics-based transitions",
                  "Dark mode that respects your system preference",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(0,122,255,0.12)" }}
                    >
                      <CheckCheck size={11} strokeWidth={2.5} color="#007AFF" />
                    </div>
                    <span style={{ fontSize: 15, lineHeight: "20px", color: "var(--label-secondary)" }}>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springDefault}
            className="relative overflow-hidden rounded-[28px] px-8 py-14 text-center"
            style={{ background: "#007AFF" }}
          >
            {/* Inner ambient orbs */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 300,
                height: 300,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                top: "-30%",
                right: "-10%",
                filter: "blur(40px)",
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(52,199,89,0.2)",
                bottom: "-20%",
                left: "5%",
                filter: "blur(40px)",
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <Lock size={24} strokeWidth={2} color="#fff" />
              </div>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 700, lineHeight: 1.12, color: "#fff", letterSpacing: "-0.01em" }}>
                Start messaging privately today
              </h2>
              <p style={{ fontSize: 17, lineHeight: "28px", color: "rgba(255,255,255,0.8)", maxWidth: 440 }}>
                Join over 100,000 users who've made the switch. Free forever, no credit card required.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => navigate("/signup")}
                  className="flex items-center gap-2 px-7 rounded-2xl"
                  style={{
                    background: "#fff",
                    color: "#007AFF",
                    fontWeight: 590,
                    fontSize: 17,
                    height: 50,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Create Free Account
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
                <button
                  className="flex items-center gap-2 px-7 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    color: "#fff",
                    fontWeight: 590,
                    fontSize: 17,
                    height: 50,
                    border: "1px solid rgba(255,255,255,0.3)",
                    cursor: "pointer",
                  }}
                >
                  View on GitHub
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="hairline px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-1 ring-border/50">
              <img src="/logo-light.png" alt="Cipher" className="h-full w-full object-cover dark:hidden" />
              <img src="/logo-dark.png" alt="Cipher" className="hidden h-full w-full object-cover dark:block" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>Cipher</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--label-tertiary)", textAlign: "center" }}>
            © 2026 Cipher. Your messages are yours. Always.
          </p>
          <div className="flex items-center gap-5">
            {["Privacy", "Terms", "Security"].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontSize: 13, color: "var(--label-secondary)", textDecoration: "none" }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
