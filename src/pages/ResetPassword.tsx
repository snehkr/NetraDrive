// src/pages/ResetPassword.tsx
import React, { useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AuthLayout } from "@/components/AuthLayout";
import { Loader2 } from "lucide-react";

interface ResetPasswordPageProps {
  onSuccess: () => void;
}

export const ResetPasswordPage: FC<ResetPasswordPageProps> = ({
  onSuccess,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      toast.error("Invalid reset link.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(token, password);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Reset failed");
      }
      toast.success("Password reset successfully!");
      onSuccess();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your new password below."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
            "Set New Password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
};
