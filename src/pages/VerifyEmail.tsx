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
      // Extract token from hash or search
      const getToken = () => {
        // 1. Try standard query params (?token=...)
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("token")) return searchParams.get("token");

        // 2. Try hash query params (#/route?token=...)
        const hash = window.location.hash;
        const qIndex = hash.indexOf("?");
        if (qIndex !== -1) {
          const hashParams = new URLSearchParams(hash.substring(qIndex));
          return hashParams.get("token");
        }
        return null;
      };

      const token = getToken();

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
