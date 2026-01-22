// src/pages/ForgotPassword.tsx
import React, { useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export const ForgotPasswordPage: FC<ForgotPasswordPageProps> = ({ onBack }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      if (!res.ok) throw new Error("Failed to send request");
      setSubmitted(true);
      toast.success("If an account exists, a reset link has been sent.");
    } catch (error) {
      toast.error("An error occurred. Please try again. " + error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="We have sent a password reset link to your email."
      >
        <Button onClick={onBack} variant="outline" className="w-full">
          Back to Login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Send Reset Link"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Button>
      </form>
    </AuthLayout>
  );
};
