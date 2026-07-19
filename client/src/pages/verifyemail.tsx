import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

import api from "../services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);
      const response = await api.post("/auth/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });

      alert(response.data.message);
      navigate("/login");
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not verify the OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email.trim()) {
      alert("Enter your email address first.");
      return;
    }

    try {
      setResending(true);
      const response = await api.post("/auth/resend-verification", {
        email: email.trim(),
      });
      alert(response.data.message);
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not send a new OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-[430px] bg-[#2b2d31] border-[#3f4147] shadow-2xl">
          <CardContent className="p-8">
            <ShieldCheck className="text-indigo-400 mb-5" size={36} />
            <h1 className="text-3xl font-bold text-white">Verify your email</h1>
            <p className="text-gray-400 mt-2">
              Enter the 6-digit code sent to your email. It expires in 10 minutes.
            </p>

            <form onSubmit={verifyOtp} className="space-y-4 mt-8">
              <Input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 bg-[#1e1f22] border-[#404249] text-white"
              />
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="6-digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                className="h-12 bg-[#1e1f22] border-[#404249] text-white text-center tracking-[0.45em] text-lg"
              />
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading ? "Verifying..." : "Verify email"}
              </Button>
            </form>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-3 border-indigo-500 text-indigo-300 hover:bg-indigo-500/10"
              onClick={resendOtp}
              disabled={resending}
            >
              {resending ? "Sending OTP..." : "Resend OTP"}
            </Button>

            <p className="text-center text-gray-400 mt-6">
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
