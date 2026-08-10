import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

import api from "../services/api";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

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
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4">

      <ThemeToggle className="absolute top-6 right-6 z-10" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[430px]"
      >

        <Card className="w-full bg-card border-border">

          <CardContent className="p-8">

            <h1 className="text-3xl font-bold text-foreground">
              Forgot Password
            </h1>

            <p className="text-muted-foreground mt-2">
              Enter your email to receive a reset link.
            </p>

            <div className="relative mt-8">

              <Mail
                className="absolute left-3 top-3 text-muted-foreground"
                size={18}
              />

              <Input
                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
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

            <p className="text-center text-muted-foreground mt-6">

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