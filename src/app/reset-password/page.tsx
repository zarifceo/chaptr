import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth-screen";

export const metadata: Metadata = {
  title: "Reset your Chaptr password",
  description: "Request a secure Chaptr password-reset link.",
};

export default function ResetPasswordRequestPage() {
  return <AuthScreen initialMode="forgot" />;
}
