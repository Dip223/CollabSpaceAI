import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setNeedsVerification(false);

      const res = await api.post("/auth/login", {
        email,
        password,
      });

      // Save JWT Token
      localStorage.setItem("token", res.data.token);

      // Save entire user object (used for chat)
      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      // Save individual fields (optional)
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
      setNeedsVerification(err.response?.status === 403);
      alert(
        err.response?.data?.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email) {
      alert("Enter your email address first.");
      return;
    }

    try {
      setResending(true);
      const res = await api.post("/auth/resend-verification", { email });
      alert(res.data.message);
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Could not resend verification email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute w-96 h-96 bg-indigo-600 rounded-full blur-[140px] opacity-30 -top-32 -left-32" />

      <div className="absolute w-96 h-96 bg-cyan-500 rounded-full blur-[150px] opacity-20 bottom-0 right-0" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[430px]"
      >
        <Card className="w-full bg-[#2b2d31] border-[#3f4147] shadow-2xl">
          <CardContent className="p-8">
            <h1 className="text-3xl text-white font-bold">
              Welcome Back
            </h1>

            <p className="text-gray-400 mt-2">
              Sign in to CollabSpace AI
            </p>

            <div className="mt-8 space-y-5">
              <div className="relative">
                <Mail
                  className="absolute left-3 top-3 text-gray-400"
                  size={18}
                />

                <Input
                  className="pl-10 bg-[#1e1f22] border-[#404249] text-white"
                  placeholder="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              <div className="relative">
                <Lock
                  className="absolute left-3 top-3 text-gray-400"
                  size={18}
                />

                <Input
                  type="password"
                  className="pl-10 bg-[#1e1f22] border-[#404249] text-white"
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />
              </div>

              <div className="flex justify-center mt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading
                  ? "Signing In..."
                  : "Login"}
              </Button>

              {needsVerification && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-indigo-500 text-indigo-300 hover:bg-indigo-500/10"
                  onClick={resendVerification}
                  disabled={resending}
                >
                  {resending ? "Sending verification email..." : "Resend verification email"}
                </Button>
              )}
            </div>

            <p className="text-gray-400 text-center mt-8">
              Don't have an account?

              <Link
                to="/register"
                className="text-indigo-400 ml-2"
              >
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}