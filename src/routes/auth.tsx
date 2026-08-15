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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDONESIAN_WHATSAPP_PATTERN = /^62(8\d{8,12})$/;

function normalizeWhatsApp(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState<"signin" | "signup" | null>(null);
  const loading = submitting !== null;

  const [view, setView] = useState<"signin" | "reset">("signin");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const logAuthError = (err: unknown, context: string) => {
    const e = err as Error & { code?: string; status?: number; name?: string };
    console.error(`[auth] ${context}`, {
      message: e?.message,
      code: e?.code,
      status: e?.status,
      name: e?.name,
    });
  };

  const validateSignup = (): string | null => {
    if (!fullName.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (!EMAIL_PATTERN.test(email.trim())) return "Please enter a valid email address.";
    if (!whatsapp.trim()) return "WhatsApp number is required.";
    if (!INDONESIAN_WHATSAPP_PATTERN.test(normalizeWhatsApp(whatsapp)))
      return "Please enter a valid WhatsApp number.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  };

  const submit = async (mode: "signin" | "signup") => {
    if (loading) return;

    if (mode === "signin") {
      if (!email.trim() || !password) {
        toast.error("Email and password are required.");
        return;
      }
      if (!EMAIL_PATTERN.test(email.trim())) {
        toast.error("Please enter a valid email address.");
        return;
      }
    } else {
      const invalid = validateSignup();
      if (invalid) {
        toast.error(invalid);
        return;
      }
    }

    setSubmitting(mode);
    try {
      if (mode === "signin") {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (result.error) {
          const message = result.error.message.toLowerCase();
          if (
            message.includes("invalid login credentials") ||
            message.includes("invalid email") ||
            message.includes("email not confirmed")
          ) {
            toast.error("Invalid email or password. Please try again.");
          } else {
            logAuthError(result.error, "sign in failed");
            toast.error("Unable to sign in. Please try again.");
          }
          return;
        }
        toast.success("Welcome back.");
        navigate({ to: "/dashboard" });
        return;
      }

      const whatsappNumber = normalizeWhatsApp(whatsapp);

      const { data: whatsappExists, error: whatsappCheckError } = await supabase.rpc(
        "whatsapp_is_registered",
        { target: whatsappNumber },
      );
      if (whatsappCheckError) {
        logAuthError(whatsappCheckError, "whatsapp uniqueness check failed");
      }
      if (whatsappExists === true) {
        toast.error("This WhatsApp number is already registered.");
        return;
      }

      const result = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), whatsapp: whatsappNumber },
          emailRedirectTo: window.location.origin,
        },
      });

      if (result.error) {
        const message = result.error.message.toLowerCase();
        if (message.includes("already registered")) {
          toast.error("An account with this email already exists.");
          setTab("signin");
          return;
        }
        if (message.includes("whatsapp") || message.includes("duplicate key")) {
          toast.error("This WhatsApp number is already registered.");
          return;
        }
        logAuthError(result.error, "sign up failed");
        toast.error("Unable to create your account. Please try again.");
        return;
      }

      if (result.data.user?.identities?.length === 0) {
        toast.error("An account with this email already exists.");
        setTab("signin");
        return;
      }

      if (result.data.session) {
        toast.success("Account created successfully!");
        navigate({ to: "/dashboard" });
        return;
      }

      toast.success("Account created successfully. Please sign in.");
      setTab("signin");
    } catch (err) {
      logAuthError(err, "authentication request failed");
      toast.error("Unable to create your account. Please try again.");
    } finally {
      setSubmitting(null);
    }
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
              <Tabs value={tab} onValueChange={(value) => setTab(value as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Register</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-4 space-y-4">
                  <form
                    className="space-y-4"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submit("signin");
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teacher@easyspeak.com"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => setView("reset")}
                          className="text-xs font-medium text-accent-foreground underline-offset-4 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <PasswordInput
                        id="signin-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {submitting === "signin" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="mt-4 space-y-4">
                  <form
                    className="space-y-4"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submit("signup");
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signup-full-name">Full name</Label>
                      <Input
                        id="signup-full-name"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teacher@easyspeak.com"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-whatsapp">WhatsApp number</Label>
                      <Input
                        id="signup-whatsapp"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="081234567890"
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used to reset your password via WhatsApp OTP.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <PasswordInput
                        id="signup-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {submitting === "signup" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Creating account…
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
