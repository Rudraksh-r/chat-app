import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { ArrowRight, Lock, Mail, MessageCircle } from "lucide-react";
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
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8 text-foreground">
      <Motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] rounded-[28px] bg-card px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] sm:px-6"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-24 items-center justify-center overflow-hidden rounded-full ring-1 ring-border/50">
            <img src="/logo-light.png" alt="Cipher" className="h-full w-full object-cover dark:hidden" />
            <img src="/logo-dark.png" alt="Cipher" className="hidden h-full w-full object-cover dark:block" />
          </div>
          <h1 className="text-[28px] font-bold leading-[34px] text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-[15px] leading-5 text-label-secondary">
            Sign in to continue your conversations.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block space-y-2">
            <span className="ml-1 text-[13px] font-medium leading-[18px] text-label-secondary">
              Email
            </span>
            <Input
              type="email"
              placeholder="name@example.com"
              icon={Mail}
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </label>

          <label className="block space-y-2">
            <span className="ml-1 text-[13px] font-medium leading-[18px] text-label-secondary">
              Password
            </span>
            <Input
              type="password"
              placeholder="Password"
              icon={Lock}
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </label>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[15px] leading-5 text-label-secondary">
              <input
                type="checkbox"
                id="remember"
                className="size-5 rounded-md border-border bg-input text-primary focus:ring-primary/50"
              />
              Remember me
            </label>
            <a
              href="#"
              className="text-[15px] font-medium leading-5 text-primary transition-opacity hover:opacity-80"
            >
              Forgot?
            </a>
          </div>

          <Button type="submit" className="mt-2 w-full" isLoading={isLoading}>
            Sign In
            {!isLoading && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="mt-8 text-center text-[15px] leading-5 text-label-secondary">
          New here?{" "}
          <Link to="/signup" className="font-medium text-primary">
            Create an account
          </Link>
        </p>
      </Motion.section>
    </main>
  );
}
