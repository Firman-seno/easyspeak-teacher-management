import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (mode: "signin" | "signup") => {
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
      toast.error(error.message);
      return;
    }
    toast.success(mode === "signin" ? "Welcome back." : "Account created.");
    navigate({ to: "/dashboard" });
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
            <CardTitle>Teacher / Admin access</CardTitle>
            <CardDescription>Sign in to manage your students and reports.</CardDescription>
          </CardHeader>
          <CardContent>
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
                    <Label htmlFor={`${mode}-password`}>Password</Label>
                    <Input
                      id={`${mode}-password`}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => submit(mode)}
                  >
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
