// src/pages/VerifyEmail.tsx
import { useEffect, useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AuthLayout } from "@/components/AuthLayout";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface VerifyEmailPageProps {
  onContinue: () => void;
}

export const VerifyEmailPage: FC<VerifyEmailPageProps> = ({ onContinue }) => {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      // Parse token from URL query params (e.g. ?token=xyz)
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        const res = await api.verifyEmail(token);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage("Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.detail || "Verification failed.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred. Please try again. " + error);
      }
    };

    verify();
  }, []);

  return (
    <AuthLayout title="Email Verification" subtitle={message}>
      <div className="flex flex-col items-center justify-center space-y-6">
        {status === "loading" && (
          <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
        )}
        {status === "success" && (
          <CheckCircle className="h-16 w-16 text-green-500" />
        )}
        {status === "error" && <XCircle className="h-16 w-16 text-red-500" />}

        {status !== "loading" && (
          <Button onClick={onContinue} className="w-full mt-4">
            Continue to Login
          </Button>
        )}
      </div>
    </AuthLayout>
  );
};
