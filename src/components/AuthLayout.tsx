// src/components/AuthLayout.tsx
import { type FC, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Cloud } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const AuthLayout: FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl glass-effect animate-scale-in">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse-slow shadow-lg">
            <Cloud className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1 text-slate-800">
          NetraDrive
        </h1>
        <h2 className="text-xl font-semibold text-center mt-2 text-slate-700">
          {title}
        </h2>
        <p className="text-center text-slate-600 mb-8 mt-1">{subtitle}</p>
        {children}
      </Card>
    </div>
  );
};
