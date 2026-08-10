import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  User,
  Mail,
  Lock,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";

import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

  const [loading, setLoading] =
    useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleRegister = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      form.password !==
      form.confirmPassword
    ) {
      alert(
        "Passwords do not match"
      );

      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        "/auth/register",
        {
          name: form.username,
          email: form.email,
          password: form.password,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      localStorage.setItem(
        "username",
        res.data.user.name
      );

      localStorage.setItem(
        "email",
        res.data.user.email
      );

      localStorage.setItem(
        "userId",
        String(res.data.user.id)
      );

      navigate("/dashboard");
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          "Registration Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center">

      <ThemeToggle className="absolute top-6 right-6 z-10" />

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-indigo-700/20 blur-[180px]" />

        <div className="absolute right-0 bottom-0 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[180px]" />

      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 25,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
        className="w-full max-w-[430px]"
      >

        <Card className="w-full border-0 bg-card shadow-2xl rounded-2xl">

          <CardContent className="p-8">

            <h1 className="text-4xl font-bold text-foreground">
              Create Account
            </h1>

            <p className="text-muted-foreground mt-2 mb-8">
              Join CollabSpace AI
            </p>

            <form
              onSubmit={handleRegister}
              className="space-y-5"
            >

              {/* Username */}
              <div className="relative">

                <User
                  size={18}
                  className="absolute left-3 top-3.5 text-muted-foreground"
                />

                <Input
                  name="username"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleChange}
                  className="
                    pl-10
                    h-12
                    bg-background
                    border-border
                    text-foreground
                    placeholder:text-muted-foreground
                    focus-visible:ring-indigo-500
                  "
                />

              </div>

              {/* Email */}
              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-3 top-3.5 text-muted-foreground"
                />

                <Input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  className="
                    pl-10
                    h-12
                    bg-background
                    border-border
                    text-foreground
                    placeholder:text-muted-foreground
                    focus-visible:ring-indigo-500
                  "
                />

              </div>

              {/* Password */}
              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-3 top-3.5 text-muted-foreground"
                />

                <Input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="
                    pl-10
                    h-12
                    bg-background
                    border-border
                    text-foreground
                    placeholder:text-muted-foreground
                    focus-visible:ring-indigo-500
                  "
                />

              </div>

              {/* Confirm Password */}
              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-3 top-3.5 text-muted-foreground"
                />

                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={
                    form.confirmPassword
                  }
                  onChange={handleChange}
                  className="
                    pl-10
                    h-12
                    bg-background
                    border-border
                    text-foreground
                    placeholder:text-muted-foreground
                    focus-visible:ring-indigo-500
                  "
                />

              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:hover:bg-indigo-600 rounded-lg text-white flex items-center justify-center transition-colors"
              >
                {loading
                  ? "Creating account..."
                  : "Create Account"}
              </button>

            </form>

            <div className="mt-8 text-center">

              <span className="text-muted-foreground">
                Already have an account?
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/login")
                }
                className="ml-2 text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
              >
                Login
              </button>

            </div>

          </CardContent>

        </Card>

      </motion.div>

    </div>
  );
}