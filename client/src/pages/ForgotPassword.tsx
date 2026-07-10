import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

import api from "../services/api";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const res = await api.post(
        "/auth/forgot-password",
        {
          email,
        }
      );

      alert(res.data.message);

    } catch (err: any) {

      alert(
        err.response?.data?.message ||
        "Something went wrong"
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center">

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >

        <Card className="w-[430px] bg-[#2b2d31] border-[#3f4147]">

          <CardContent className="p-8">

            <h1 className="text-3xl font-bold text-white">
              Forgot Password
            </h1>

            <p className="text-gray-400 mt-2">
              Enter your email to receive a reset link.
            </p>

            <div className="relative mt-8">

              <Mail
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />

              <Input
                className="pl-10 bg-[#1e1f22] border-[#404249] text-white"
                placeholder="Email"
                value={email}
                onChange={(e)=>
                  setEmail(e.target.value)
                }
              />

            </div>

            <Button
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={loading}
            >
              {
                loading
                ? "Sending..."
                : "Send Reset Link"
              }
            </Button>

            <p className="text-center text-gray-400 mt-6">

              <Link
                to="/login"
                className="text-indigo-400"
              >
                Back to Login
              </Link>

            </p>

          </CardContent>

        </Card>

      </motion.div>

    </div>
  );
}