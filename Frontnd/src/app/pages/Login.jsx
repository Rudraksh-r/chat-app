import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button, Input } from "../components/ui/index";
import useAuthStore from "../store/authStore";

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-3xl p-8 shadow-2xl shadow-primary/5 border border-border z-10"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--primary-foreground)" />
              <path d="M2 17L12 22L22 17" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to continue your conversations</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground ml-1">Email address</label>
            <Input
              type="email"
              placeholder="name@company.com"
              icon={Mail}
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <a href="#" className="text-sm font-medium text-primary hover:opacity-80 transition-colors">Forgot password?</a>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              icon={Lock}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2 ml-1">
            <input type="checkbox" id="remember" className="rounded bg-input border-border text-primary focus:ring-primary/50 w-4 h-4" />
            <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me for 30 days</label>
          </div>

          <Button type="submit" className="w-full h-12 text-base mt-4 group" isLoading={isLoading}>
            Sign In
            {!isLoading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:opacity-80 font-medium transition-colors">
            Create an account
          </Link>
        </p>
      </Motion.div>
    </div>
  );
}
