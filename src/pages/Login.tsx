// src/pages/Login.tsx
import React, { useState, useRef, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigateForgot: () => void;
}

export const LoginPage: FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateForgot,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const username = usernameRef.current?.value;
    const password = passwordRef.current?.value;

    if (!username || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }
    try {
      let response;
      if (isLogin) {
        response = await api.login(username, password);
      } else {
        const email = emailRef.current?.value;
        if (!email) {
          setError("Please provide an email.");
          setLoading(false);
          return;
        }
        response = await api.signup(username, email, password);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "An error occurred.");

      if (isLogin) {
        api.setTokens(data.access_token, data.refresh_token);
        onLoginSuccess();
      } else {
        toast.success("Signup successful! Please verify your email.");
        setIsLogin(true);
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isLogin ? "Welcome Back" : "Create Account"}
      subtitle={
        isLogin ? "Please log in to continue." : "Sign up to get started."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <Input
            ref={usernameRef}
            placeholder="Username"
            required
            className="smooth-transition"
          />
          {!isLogin && (
            <Input
              ref={emailRef}
              type="email"
              placeholder="Email"
              required
              className="smooth-transition"
            />
          )}
          <Input
            ref={passwordRef}
            type="password"
            placeholder="Password"
            required
            className="smooth-transition"
          />
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-4 animate-slide-down">
            {error}
          </p>
        )}

        {isLogin && (
          <div className="flex justify-end">
            <Button
              variant="link"
              type="button"
              onClick={onNavigateForgot}
              className="px-0 text-sm text-indigo-600"
            >
              Forgot Password?
            </Button>
          </div>
        )}

        <Button
          type="submit"
          className="w-full mt-2 hover-lift bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLogin ? (
            "Login"
          ) : (
            "Sign Up"
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <Button
          variant="link"
          className="p-1 h-auto smooth-transition text-indigo-600 hover:text-indigo-700"
          onClick={() => {
            setIsLogin((p) => !p);
            setError("");
          }}
        >
          {isLogin ? "Sign up" : "Log in"}
        </Button>
      </p>
    </AuthLayout>
  );
};
