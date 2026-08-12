import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  Building2,
  Camera,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Save,
  School,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/password-input";
import { PageHeader } from "@/components/kit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-data";
import { api, qk } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/domain";

const PREFS_KEY = "easyspeak_preferences";

type Preferences = {
  language: string;
  timezone: string;
  notifyEmail: boolean;
  notifyAssignments: boolean;
  notifyReminders: boolean;
  notifyUpdates: boolean;
};

const DEFAULT_PREFS: Preferences = {
  language: "en",
  timezone: "Asia/Jakarta",
  notifyEmail: true,
  notifyAssignments: true,
  notifyReminders: true,
  notifyUpdates: false,
};

const LANGUAGES = ["English", "Bahasa Indonesia", "中文", "한국어", "日本語", "العربية"] as const;
const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Bangkok",
  "Asia/Manila",
] as const;

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EasySpeak Teacher Management" },
      {
        name: "description",
        content: "Manage your school profile, account security and notification preferences.",
      },
      { property: "og:title", content: "Settings — EasySpeak Teacher Management" },
      { property: "og:description", content: "Profile, account and notification preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const settings = useSettings();
  const { user } = useRouteContext({ from: "/_authenticated" });

  const [schoolName, setSchoolName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (user?.user_metadata?.["avatar_url"] as string | undefined) ?? null,
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const displayAvatar = pendingFile && previewUrl ? previewUrl : avatarUrl;

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setSchoolName(s.school_name ?? "");
    setTeacherName(s.teacher_name ?? "");
    setPhone(s.phone ?? "");
    setAddress(s.address ?? "");
  }, [settings.data]);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const savePrefs = (next: Preferences) => {
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must not exceed 5 MB");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelAvatar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const saveAvatar = async () => {
    const userId = user?.id;
    if (!pendingFile || !userId) return;
    setAvatarUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, pendingFile, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) {
        await supabase.storage.from("avatars").remove([path]);
        throw new Error(updateError.message);
      }
      const { data: existing } = await supabase.storage.from("avatars").list(userId);
      const stale = (existing ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
      if (stale.length > 0) await supabase.storage.from("avatars").remove(stale);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setAvatarUrl(publicUrl);
      setPendingFile(null);
      setPreviewUrl(null);
      toast.success("Profile photo updated successfully");
    } catch {
      toast.error("Failed to update profile photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    const userId = user?.id;
    setAvatarUploading(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
      if (error) throw new Error(error.message);
      if (userId) {
        const { data: existing } = await supabase.storage.from("avatars").list(userId);
        const paths = (existing ?? []).map((f) => `${userId}/${f.name}`);
        if (paths.length > 0) await supabase.storage.from("avatars").remove(paths);
      }
      setAvatarUrl(null);
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = useMutation({
    mutationFn: () =>
      api.saveSettings({
        school_name: schoolName.trim(),
        teacher_name: teacherName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Profile settings saved.");
    },
    onError: () => toast.error("Something went wrong."),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("New passwords do not match.");
      if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
      const email = user?.email;
      if (!email) throw new Error("Unable to verify your current password.");
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (checkError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong."),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your school profile, account security and notification preferences."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-accent" /> Profile
            </CardTitle>
            <CardDescription>School details used on reports and student records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 shrink-0">
                {displayAvatar && <AvatarImage src={displayAvatar} alt="Teacher profile photo" />}
                <AvatarFallback className="text-lg">
                  {initials(
                    (user?.user_metadata?.["full_name"] as string | undefined) ??
                      user?.email ??
                      "T",
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  {pendingFile ? (
                    <>
                      <Button size="sm" onClick={saveAvatar} disabled={avatarUploading}>
                        {avatarUploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        {avatarUploading ? "Uploading…" : "Save photo"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelAvatar}
                        disabled={avatarUploading}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                      >
                        <Camera className="size-4" /> Change photo
                      </Button>
                      {avatarUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeAvatar}
                          disabled={avatarUploading}
                        >
                          <Trash2 className="size-4" /> Remove
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Upload className="size-3.5" /> JPG, PNG or WEBP. Max 5MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onAvatarFile}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school-name">School name</Label>
              <Input
                id="school-name"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="EasySpeak Language School"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher-name">Teacher name</Label>
              <Input
                id="teacher-name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812 3456 7890"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="School address"
                />
              </div>
            </div>
            <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              <Save className="size-4" /> Save profile
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-accent" /> Account
            </CardTitle>
            <CardDescription>Your sign-in email and password security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account-email">Email</Label>
              <div className="relative">
                <Input
                  id="account-email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="pr-10"
                />
                <Mail className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Signed in with Supabase Auth. Contact support to change your email.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <KeyRound className="size-4 text-accent" /> Change password
              </p>
              <div className="mt-3 grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Current password</Label>
                  <PasswordInput
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <PasswordInput
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <PasswordInput
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => changePassword.mutate()}
                disabled={changePassword.isPending}
              >
                <KeyRound className="size-4" /> Update password
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Sign out</p>
                <p className="text-xs text-muted-foreground">
                  End this session and return to the sign-in page.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-accent" /> Notifications
          </CardTitle>
          <CardDescription>Choose what updates you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {[
            {
              key: "notifyEmail" as const,
              icon: <Mail className="size-4 text-muted-foreground" />,
              title: "Email notifications",
              description: "Receive report and progress updates by email.",
            },
            {
              key: "notifyAssignments" as const,
              icon: <BellRing className="size-4 text-muted-foreground" />,
              title: "Assignment reminders",
              description: "Get reminders when project deadlines approach.",
            },
            {
              key: "notifyReminders" as const,
              icon: <Bell className="size-4 text-muted-foreground" />,
              title: "Lesson reminders",
              description: "Get reminders before upcoming lessons.",
            },
            {
              key: "notifyUpdates" as const,
              icon: <Globe className="size-4 text-muted-foreground" />,
              title: "Product updates",
              description: "News about new features and improvements.",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Switch
                checked={prefs[item.key]}
                onCheckedChange={(checked) => savePrefs({ ...prefs, [item.key]: checked })}
                aria-label={item.title}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4 text-accent" /> Preferences
          </CardTitle>
          <CardDescription>Localisation settings for this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="language">Language</Label>
            <Select
              value={prefs.language}
              onValueChange={(language) => savePrefs({ ...prefs, language })}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang === "English" ? "en" : lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={prefs.timezone}
              onValueChange={(timezone) => savePrefs({ ...prefs, timezone })}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
