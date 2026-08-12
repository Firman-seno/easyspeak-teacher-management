import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, GraduationCap, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Create a new password for your EasySpeak teacher account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setUnverified(true);
    });
  }, []);

  const submit = async () => {
    if (submitting) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setUpdated(true);
      toast.success("Your password has been updated successfully.");
    } catch (err) {
      const e = err as Error & { name?: string };
      console.error("[reset-password-update]", e);
      const message = e.message ?? "";
      const lower = message.toLowerCase();
      if (
        e.name === "AuthRetryableFetchError" ||
        lower.includes("fetch failed") ||
        lower.includes("network")
      ) {
        toast.error(
          "Unable to connect to the server. Please check your internet connection and try again.",
        );
      } else {
        toast.error("Unable to update your password. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
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
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>Create a new password for your EasySpeak account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {updated ? (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  Your password has been updated successfully.
                </div>
                <Button asChild className="w-full">
                  <Link to="/auth">Back to sign in</Link>
                </Button>
              </>
            ) : unverified ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has expired. Please request a new one from
                  the sign-in page.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Back to sign in</Link>
                </Button>
              </>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">New password</Label>
                  <PasswordInput
                    id="reset-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                  <PasswordInput
                    id="reset-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  <KeyRound className="size-4" /> {submitting ? "Updating…" : "Update password"}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/auth">
                    <ArrowLeft className="size-4" /> Back to sign in
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
