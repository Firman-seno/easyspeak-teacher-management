import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/password-input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — EasySpeak Teacher Management" },
      {
        name: "description",
        content:
          "Teacher sign in for EasySpeak: manage student attendance, learning progress, projects and monthly reports.",
      },
      { property: "og:title", content: "Sign in — EasySpeak Teacher Management" },
      {
        property: "og:description",
        content: "Teacher workspace for attendance, progress tracking and monthly PDF reports.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<"signin" | "reset">("signin");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (mode: "signin" | "signup") => {
    if (loading) return;
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setLoading(false);
    if (error) {
      if (
        mode === "signin" &&
        (error.message.includes("Invalid login credentials") ||
          error.message.toLowerCase().includes("invalid email"))
      ) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(mode === "signin" ? "Welcome back." : "Account created.");
    navigate({ to: "/dashboard" });
  };

  const sendResetLink = async (email: string) => {
    console.log("[reset-password] Sending password reset request");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      const e = err as Error & { name?: string; status?: number; code?: string };
      console.error("Password reset failed:", {
        message: e.message,
        code: e.code,
        status: e.status,
        name: e.name,
      });
      const lower = (e.message ?? "").toLowerCase();
      if (
        e.code === "over_email_send_rate_limit" ||
        e.code === "over_request_rate_limit" ||
        lower.includes("rate limit")
      ) {
        toast.error("Password reset email is temporarily unavailable. Please try again later.");
      } else if (
        e.name === "AuthRetryableFetchError" ||
        lower.includes("fetch failed") ||
        lower.includes("network")
      ) {
        toast.error(
          "Unable to connect to the server. Please check your internet connection and try again.",
        );
      } else if (lower.includes("redirect") || lower.includes("not allowed")) {
        toast.error("Password reset configuration is invalid.");
      } else if (
        lower.includes("smtp") ||
        lower.includes("email provider") ||
        lower.includes("message delivery") ||
        lower.includes("temporary failure")
      ) {
        toast.error("Email service is currently unavailable.");
      } else {
        toast.error("Unable to send reset email. Please try again later.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (resetLoading) return;
    const trimmed = resetEmail.trim();
    if (!trimmed) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setResetLoading(true);
    void sendResetLink(trimmed);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
            <GraduationCap className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-primary-foreground">
              EasySpeak Teacher Management
            </h1>
            <p className="truncate text-xs text-primary-foreground/70">
              Attendance • Progress • Projects • Reports
            </p>
          </div>
        </div>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>
              {view === "reset" ? "Reset your password" : "Teacher / Admin access"}
            </CardTitle>
            <CardDescription>
              {view === "reset"
                ? "Enter your email and we'll send you a password reset link."
                : "Sign in to manage your students and reports."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === "reset" ? (
              resetSent ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium text-foreground">Check your email</p>
                      <p className="mt-0.5 text-emerald-700">
                        Password reset instructions have been sent to your email address.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        If an account exists for this email, you&apos;ll receive a reset link within
                        a few minutes. If it doesn&apos;t arrive, check your spam folder.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setResetSent(false);
                      setView("signin");
                    }}
                  >
                    <ArrowLeft className="size-4" /> Back to sign in
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleResetSubmit} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="teacher@easyspeak.com"
                      disabled={resetLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll email you a secure link to reset your password.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setResetSent(false);
                      setView("signin");
                    }}
                  >
                    <ArrowLeft className="size-4" /> Back to sign in
                  </Button>
                </form>
              )
            ) : (
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                {(["signin", "signup"] as const).map((mode) => (
                  <TabsContent key={mode} value={mode} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${mode}-email`}>Email</Label>
                      <Input
                        id={`${mode}-email`}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teacher@easyspeak.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${mode}-password`}>Password</Label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            onClick={() => setView("reset")}
                            className="text-xs font-medium text-accent-foreground underline-offset-4 hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <PasswordInput
                        id={`${mode}-password`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button className="w-full" disabled={loading} onClick={() => submit(mode)}>
                      {mode === "signin" ? "Sign in" : "Create account"}
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
