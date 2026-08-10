import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";

import api from "../services/api";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

export default function ResetPassword() {
  const { token } = useParams();

  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        `/auth/reset-password/${token}`,
        {
          password,
        }
      );

      alert(res.data.message);

      navigate("/login");

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
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[430px]"
      >

        <Card className="w-full bg-card border-border">

          <CardContent className="p-8">

            <h1 className="text-3xl text-foreground font-bold">
              Reset Password
            </h1>

            <p className="text-muted-foreground mt-2">
              Enter your new password.
            </p>

            <div className="space-y-5 mt-8">

              <div className="relative">

                <Lock
                  className="absolute left-3 top-3 text-muted-foreground"
                  size={18}
                />

                <Input
                  type="password"
                  placeholder="New Password"
                  className="pl-10 bg-background border-border text-foreground"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

              </div>

              <div className="relative">

                <Lock
                  className="absolute left-3 top-3 text-muted-foreground"
                  size={18}
                />

                <Input
                  type="password"
                  placeholder="Confirm Password"
                  className="pl-10 bg-background border-border text-foreground"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                />

              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={handleReset}
                disabled={loading}
              >
                {loading
                  ? "Updating..."
                  : "Reset Password"}
              </Button>

            </div>

          </CardContent>

        </Card>

      </motion.div>

    </div>
  );
}