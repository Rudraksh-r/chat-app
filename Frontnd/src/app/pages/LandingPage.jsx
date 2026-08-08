import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "motion/react";
import {
  Lock,
  MessageCircle,
  Zap,
  Shield,
  Users,
  ArrowRight,
  ChevronRight,
  CheckCheck,
  Smile,
  CirclePlus,
  Search,
  Moon,
  Sun,
  Fingerprint,
  Sparkles
} from "lucide-react";

// ── Shared Animation Config ──
const springConfig = { type: "spring", bounce: 0, duration: 0.4 };
const transitionSnap = { type: "spring", bounce: 0, duration: 0.4 };

// ── Mock Data for Hero ──
const mockMessages = [
  { id: 1, sender: "Alice", text: "Did you see the new Cipher update?", time: "10:41 AM", sent: false },
  { id: 2, sender: "Me", text: "Yes! The design is absolutely stunning ✨", time: "10:42 AM", sent: true },
  { id: 3, sender: "Alice", text: "And it's E2E encrypted by default.", time: "10:42 AM", sent: false },
  { id: 4, sender: "Me", text: "Privacy + Aesthetics = 🚀", time: "10:43 AM", sent: true },
];

const features = [
  {
    icon: Fingerprint,
    title: "Military-Grade Encryption",
    description: "Your keys never leave your device. AES-256-GCM encryption secures every byte.",
    color: "#6366f1", // Indigo
  },
  {
    icon: Zap,
    title: "Instant Delivery",
    description: "Built on WebSockets for zero-latency communication. Feel the speed.",
    color: "#10b981", // Emerald
  },
  {
    icon: Users,
    title: "Secure Groups",
    description: "Collaborate securely with groups. Perfect for teams who demand privacy.",
    color: "#f59e0b", // Amber
  },
  {
    icon: Shield,
    title: "Zero Metadata",
    description: "We don't know who you talk to, when you talk, or what you say. Period.",
    color: "#d946ef", // Fuchsia
  },
  {
    icon: Sparkles,
    title: "Fluid Interface",
    description: "A gorgeous, responsive UI packed with micro-animations and delight.",
    color: "#ec4899", // Pink
  },
  {
    icon: MessageCircle,
    title: "Expressive Chat",
    description: "Reactions, read receipts, and rich media — without sacrificing security.",
    color: "#3b82f6", // Blue
  },
];

// ── Components ──

function MeshBackground({ dark }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute inset-0 transition-colors duration-700 bg-background" />
      
      {/* Primary Orb */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-5%]"
        style={{
          width: '60vw',
          height: '60vw',
          background: dark 
            ? 'radial-gradient(circle, rgba(10,132,255,0.15) 0%, transparent 60%)' 
            : 'radial-gradient(circle, rgba(0,122,255,0.2) 0%, transparent 60%)',
          filter: 'blur(80px)',
          borderRadius: '50%',
        }}
      />
      
      {/* Secondary Orb */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -40, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-20%] left-[-10%]"
        style={{
          width: '50vw',
          height: '50vw',
          background: dark 
            ? 'radial-gradient(circle, rgba(10,132,255,0.1) 0%, transparent 60%)' 
            : 'radial-gradient(circle, rgba(0,122,255,0.15) 0%, transparent 60%)',
          filter: 'blur(90px)',
          borderRadius: '50%',
        }}
      />

      {/* Tertiary Orb */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 30, 0],
          y: [0, -40, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-[30%] left-[20%]"
        style={{
          width: '40vw',
          height: '40vw',
          background: dark 
            ? 'radial-gradient(circle, rgba(10,132,255,0.08) 0%, transparent 60%)' 
            : 'radial-gradient(circle, rgba(0,122,255,0.12) 0%, transparent 60%)',
          filter: 'blur(100px)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

function HeroMockup({ dark }) {
  const [visibleMessages, setVisibleMessages] = useState([]);
  
  // 3D Tilt Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), springConfig);

  useEffect(() => {
    mockMessages.forEach((msg, i) => {
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, msg.id]);
      }, 800 + i * 900);
    });
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div 
      className="relative w-full max-w-[360px] mx-auto perspective-[1200px]"
      style={{ height: 600 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="w-full h-full"
      >
        <div
          className={`absolute inset-0 rounded-[48px] overflow-hidden shadow-2xl transition-colors duration-500 border ${
            dark 
              ? 'bg-[#111118] border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
          }`}
        >
          {/* Mockup Header */}
          <div
            className={`flex items-center gap-3 px-5 pt-12 pb-4 border-b backdrop-blur-md ${
              dark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'
            }`}
            style={{ transform: "translateZ(30px)" }} // Pop out effect
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-[17px] ${dark ? 'text-white' : 'text-slate-900'}`}>Alice</p>
              <p className="text-[12px] text-emerald-500 font-medium">● Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3 px-4 py-6 overflow-hidden h-[400px]">
            <AnimatePresence>
              {mockMessages.map((msg) =>
                visibleMessages.includes(msg.id) ? (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={transitionSnap}
                    style={{ transform: "translateZ(20px)" }}
                    className={`flex flex-col ${msg.sent ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`px-4 py-2.5 max-w-[80%] text-[15px] leading-relaxed shadow-sm ${
                        msg.sent 
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl rounded-tr-sm" 
                          : dark 
                            ? "bg-[#1f1f2e] text-slate-200 rounded-2xl rounded-tl-sm border border-white/5" 
                            : "bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm border border-black/5"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 px-1 flex items-center gap-1">
                      {msg.time}
                      {msg.sent && <CheckCheck size={12} className="text-indigo-500" />}
                    </div>
                  </motion.div>
                ) : null
              )}
            </AnimatePresence>
          </div>

          {/* Input Bar */}
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 border-t backdrop-blur-md ${
              dark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'
            }`}
            style={{ transform: "translateZ(40px)" }}
          >
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
              dark ? 'bg-black/20 border-white/10' : 'bg-white border-black/10 shadow-sm'
            }`}>
              <CirclePlus size={20} className="text-slate-400" />
              <div className={`flex-1 text-[15px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Message Alice...
              </div>
              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shadow-md">
                <ArrowRight size={14} className="text-white" />
              </div>
            </div>
          </div>

          {/* Glare effect */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-[48px] bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" 
            style={{ transform: "translateZ(50px)" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color, index, dark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ type: "spring", bounce: 0, duration: 0.5, delay: index * 0.05 }}
      className="relative group rounded-3xl p-6 transition-all duration-300 border border-border bg-card shadow-lg md:hover:shadow-xl md:hover:-translate-y-1 md:hover:scale-[1.02]"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner"
        style={{ 
          background: dark ? `rgba(255,255,255,0.05)` : `${color}15`,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : `${color}30`}`
        }}
      >
        <Icon size={24} color={color} />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-card-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      
      {/* Subtle bottom glow on hover */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500"
        style={{ color: color }}
      />
    </motion.div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  // We manage the toggle state and sync it with document.documentElement.classList
  const [dark, setDark] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleScroll = (e) => setScrolled(e.currentTarget.scrollTop > 20);

  return (
    <div 
      onScroll={handleScroll}
      className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden scroll-smooth font-sans transition-colors duration-200 bg-background text-foreground"
    >
      <MeshBackground dark={dark} />

      {/* ── Floating Navbar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center mt-4 px-4 transition-transform duration-300" style={{ transform: scrolled ? 'translateY(0)' : 'translateY(4px)' }}>
        <motion.nav
          className={`flex items-center justify-between px-4 py-2 w-full max-w-4xl rounded-full border shadow-lg backdrop-blur-xl transition-all duration-300 ${
            dark 
              ? 'bg-black/40 border-white/10 shadow-black/50' 
              : 'bg-white/70 border-black/5 shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center gap-3 pl-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-indigo-500/50 shadow-inner">
              <img src="/logo-light.png" alt="Cipher" className="h-full w-full object-cover dark:hidden" />
              <img src="/logo-dark.png" alt="Cipher" className="hidden h-full w-full object-cover dark:block" />
            </div>
            <span className="font-bold text-[17px] tracking-tight">Cipher</span>
          </div>

          <div className="hidden md:flex items-center gap-8 font-medium text-[14px]">
            {["Features", "Security"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={`transition-colors duration-200 ${dark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-primary'}`}
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                dark ? 'bg-white/10 hover:bg-white/20 text-yellow-400' : 'bg-secondary md:hover:bg-secondary/80 text-primary'
              }`}
              aria-label="Toggle dark mode"
            >
              <motion.div
                initial={false}
                animate={{ rotate: dark ? 0 : 180 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                {dark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
              </motion.div>
            </button>
            <button
              onClick={() => navigate("/login")}
              className="hidden md:flex items-center gap-2 px-5 h-10 rounded-full font-semibold text-[14px] transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] shadow-md bg-foreground text-background hover:opacity-90"
            >
              Sign In
            </button>
          </div>
        </motion.nav>
      </div>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left: Copy */}
          <div className="flex flex-col items-start gap-8 z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border bg-primary/10 text-primary border-primary/20"
            >
              <Sparkles size={14} />
              <span>Cipher v2.0 is now live</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
              className="text-[clamp(44px,6vw,72px)] font-extrabold leading-[1.05] tracking-tight"
            >
              Secure messaging that feels <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 animate-gradient-x">
                truly alive.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
              className={`text-[clamp(16px,2vw,20px)] leading-relaxed max-w-lg ${
                dark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Experience the perfect harmony of uncompromising end-to-end encryption and a stunning, fluid interface. Privacy doesn't have to be boring.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
              className="flex flex-wrap items-center gap-4 mt-2"
            >
              <button
                onClick={() => navigate("/signup")}
                className="group relative flex items-center gap-3 px-8 h-14 rounded-full bg-primary text-primary-foreground font-semibold text-[16px] shadow-[0_0_40px_rgba(0,122,255,0.4)] transition-transform duration-150 ease-out active:scale-[0.97] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full md:group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10">Start Chatting Free</span>
                <ArrowRight size={18} className="relative z-10 md:group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                className="flex items-center gap-2 px-8 h-14 rounded-full font-semibold text-[16px] transition-transform duration-150 ease-out active:scale-[0.97] border border-border bg-card text-card-foreground shadow-sm hover:bg-secondary"
              >
                Read the Docs
              </button>
            </motion.div>
          </div>

          {/* Right: 3D Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, type: "spring" }}
            className="w-full flex justify-center lg:justify-end z-10"
          >
            <HeroMockup dark={dark} />
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="relative px-6 py-32 z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-20"
          >
            <h2 className="text-[clamp(32px,4vw,48px)] font-bold tracking-tight mb-6">
              Engineered for Privacy.<br/>Designed for Humans.
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              We rebuilt secure messaging from the ground up to prove that robust encryption can coexist with a beautiful, modern user experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} dark={dark} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Deep Dive / Bento Grid Section ── */}
      <section id="security" className="px-6 py-20 pb-40 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Big Bento Box 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-8 rounded-[32px] p-8 md:p-12 relative overflow-hidden flex flex-col justify-between border border-border bg-card shadow-xl"
            >
              <div className="relative z-10 max-w-md">
                <h3 className="text-3xl font-bold mb-4">Zero Knowledge Architecture</h3>
                <p className="text-lg text-muted-foreground">
                  Our servers act simply as blind relays. We cannot decrypt, read, or analyze your conversations. Your data is mathematically locked to your devices.
                </p>
              </div>
              
              {/* Decorative graphic */}
              <div className="absolute right-[-10%] bottom-[-20%] w-[60%] opacity-40 pointer-events-none">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-primary/20">
                  <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97,-2.4C97.1,13.2,91.3,28.8,81.8,41.9C72.3,55,59.1,65.6,44.5,72.7C29.9,79.8,14.9,83.4,-0.4,84.1C-15.8,84.8,-31.5,82.5,-45.3,74.9C-59.2,67.3,-71.1,54.4,-79.8,39.4C-88.5,24.4,-93.9,7.4,-92.3,-9.1C-90.7,-25.6,-82.1,-41.6,-70,-54.2C-57.9,-66.7,-42.3,-75.8,-27.1,-79.9C-11.9,-83.9,2.8,-82.9,17.4,-80.1C31.9,-77.3,44.7,-76.4,44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
              </div>
            </motion.div>

            {/* Small Bento Box 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-4 rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-between border border-border bg-card shadow-xl"
            >
              <div className="w-12 h-12 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center mb-8">
                <Moon size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Flawless Dark Mode</h3>
                <p className="text-muted-foreground">
                  Hand-tuned colors for both light and dark environments. 
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`relative border-t py-12 px-6 z-10 ${dark ? 'border-white/10 bg-[#030712]/50' : 'border-black/5 bg-[#f8fafc]/50'} backdrop-blur-xl`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-indigo-500/50">
              <img src="/logo-light.png" alt="Cipher" className="h-full w-full object-cover dark:hidden" />
              <img src="/logo-dark.png" alt="Cipher" className="hidden h-full w-full object-cover dark:block" />
            </div>
            <span className="font-bold text-lg">Cipher</span>
          </div>
          
          <p className={`text-sm ${dark ? 'text-slate-500' : 'text-slate-500'}`}>
            © {new Date().getFullYear()} Cipher. Privacy is a human right.
          </p>
          
          <div className="flex gap-6 text-sm font-medium">
            <a href="#" className={`hover:text-indigo-500 transition-colors ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Twitter</a>
            <a href="#" className={`hover:text-indigo-500 transition-colors ${dark ? 'text-slate-400' : 'text-slate-600'}`}>GitHub</a>
            <a href="#" className={`hover:text-indigo-500 transition-colors ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
