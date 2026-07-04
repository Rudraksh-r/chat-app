import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { Mail, Lock, User, Image as ImageIcon } from "lucide-react";
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
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4 py-12">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-3xl p-8 shadow-2xl shadow-primary/5 border border-border z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Create an account</h1>
          <p className="text-muted-foreground">Join the best communication platform</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative group cursor-pointer">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center border-2 border-dashed border-border group-hover:border-primary transition-colors">
                <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[10px] font-medium text-white uppercase tracking-wider">Upload</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground ml-1">Full Name</label>
            <Input
              type="text"
              placeholder="John Doe"
              icon={User}
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground ml-1">Username</label>
            <Input
              type="text"
              placeholder="johndoe"
              icon={User}
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

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
            <label className="text-sm font-medium text-muted-foreground ml-1">Password</label>
            <Input
              type="password"
              placeholder="Create a strong password"
              icon={Lock}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base mt-6" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:opacity-80 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </Motion.div>
    </div>
  );
}
