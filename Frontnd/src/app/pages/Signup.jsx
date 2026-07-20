import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { Camera, Lock, Mail, User } from "lucide-react";
import { Button, Input } from "../components/ui/index";
import useAuthStore from "../store/authStore";

export function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });

  const handleSignup = async (e) => {
    e.preventDefault();
    const success = await signup(formData);
    if (success) navigate("/");
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-8 text-foreground">
      <Motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] rounded-[28px] bg-card px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)] sm:px-6"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex size-24 items-center justify-center overflow-hidden rounded-full ring-1 ring-border/50">
            <img src="/logo-light.png" alt="Cipher" className="h-full w-full object-cover dark:hidden" />
            <img src="/logo-dark.png" alt="Cipher" className="hidden h-full w-full object-cover dark:block" />
          </div>
          <h1 className="text-[28px] font-bold leading-[34px] text-foreground">
            Create Account
          </h1>
          <p className="mt-2 text-[15px] leading-5 text-label-secondary">
            Start a private, encrypted chat space.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="flex justify-center pb-2">
            <button
              type="button"
              className="relative flex size-24 items-center justify-center rounded-full bg-secondary text-label-secondary transition-colors active:scale-[0.98]"
            >
              <User className="size-10 stroke-[1.75]" />
              <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
                <Camera className="size-4 stroke-[1.75]" />
              </span>
            </button>
          </div>

          <label className="block space-y-2">
            <span className="ml-1 text-[13px] font-medium leading-[18px] text-label-secondary">
              Full Name
            </span>
            <Input
              type="text"
              placeholder="Alex Morgan"
              icon={User}
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
          </label>

          <label className="block space-y-2">
            <span className="ml-1 text-[13px] font-medium leading-[18px] text-label-secondary">
              Username
            </span>
            <Input
              type="text"
              placeholder="alex"
              icon={User}
              required
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </label>

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
              placeholder="Create a password"
              icon={Lock}
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </label>

          <Button type="submit" className="mt-2 w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="mt-8 text-center text-[15px] leading-5 text-label-secondary">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary">
            Sign in
          </Link>
        </p>
      </Motion.section>
    </main>
  );
}
