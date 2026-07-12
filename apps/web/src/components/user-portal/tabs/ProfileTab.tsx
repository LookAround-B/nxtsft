"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/portal/PortalShell";
import { PushToggle } from "@/components/site/PushToggle";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { type FeaturedProp } from "@/components/home/homeData";
import { Head, DEMO_USER } from "./shared";

export function ProfileTab() {
  const { session, updateProfile } = useAuth();
  const updateProfileMutation = trpc.users.updateProfile.useMutation();
  const favoritesQ = trpc.users.favorites.useQuery(undefined, { enabled: !!session });
  const [name, setName] = useState(session?.name ?? DEMO_USER.name);
  const [phone, setPhone] = useState(session?.phone ?? DEMO_USER.phone);
  const [city, setCity] = useState(DEMO_USER.city);
  const [budget, setBudget] = useState("₹50L – ₹1.5Cr");
  const [propType, setPropType] = useState("Apartment");
  const [timeline, setTimeline] = useState("3–6 months");

  // Email preferences
  const [emailNewMatches, setEmailNewMatches] = useState(true);
  const [emailPriceDrops, setEmailPriceDrops] = useState(true);
  const [emailVisitRemind, setEmailVisitRemind] = useState(false);

  // Notification preferences
  const [notifNewMatches, setNotifNewMatches] = useState(true);
  const [notifPriceDrops, setNotifPriceDrops] = useState(false);
  const [notifVisitRemind, setNotifVisitRemind] = useState(true);

  // Change password
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");

  const handleDownloadCSV = () => {
    const saved = (favoritesQ.data ?? []) as unknown as FeaturedProp[];
    if (saved.length === 0) {
      toast.error("No saved properties to export yet.");
      return;
    }
    const header = ["ID", "Property", "Type", "Locality", "City", "Price"];
    const rows = saved.map((p) => [
      p.id,
      `"${p.title}"`,
      p.type ?? "",
      p.location?.locality ?? "",
      p.location?.city ?? "",
      p.price,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nxtsft-my-data.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const Toggle = ({
    on,
    onChange,
    label,
  }: {
    on: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-navy">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-accent" : "bg-secondary"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );

  return (
    <>
      <Head t="Profile" s="Manage your account details and preferences." />

      {/* Basic Info */}
      <Section title="Personal Information">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              value={session?.email ?? DEMO_USER.email}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">City</label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Mumbai", "Bengaluru", "Pune", "Delhi", "Hyderabad", "Chennai"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <button
          onClick={async () => {
            const n = name.trim() || (session?.name ?? DEMO_USER.name);
            const p = phone.replace(/\D/g, "").slice(-10);
            try {
              await updateProfileMutation.mutateAsync({ name: n, phone: p || undefined });
              updateProfile(n, phone.trim());
              toast.success("Profile updated");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to update profile.");
            }
          }}
          disabled={updateProfileMutation.isPending}
          className="mt-4 w-full sm:w-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {updateProfileMutation.isPending ? "Saving…" : "Save Changes"}
        </button>
      </Section>

      {/* Property Preferences */}
      <Section title="Property Preferences">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Budget Range
            </label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Under ₹50L", "₹50L – ₹1.5Cr", "₹1.5Cr – ₹3Cr", "₹3Cr – ₹6Cr", "₹6Cr+"].map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Preferred Type
            </label>
            <Select value={propType} onValueChange={setPropType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Apartment", "Villa", "Studio", "Bungalow", "Commercial"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Buy Timeline
            </label>
            <Select value={timeline} onValueChange={setTimeline}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Immediately", "1–3 months", "3–6 months", "6–12 months", "Just exploring"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <button
          onClick={() => toast.success("Preferences saved")}
          className="mt-4 w-full sm:w-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Save Preferences
        </button>
      </Section>

      {/* Email Preferences */}
      <Section title="Email Preferences">
        <Toggle on={emailNewMatches} onChange={setEmailNewMatches} label="New property matches" />
        <Toggle on={emailPriceDrops} onChange={setEmailPriceDrops} label="Price drop alerts" />
        <Toggle on={emailVisitRemind} onChange={setEmailVisitRemind} label="Site visit reminders" />
      </Section>

      {/* Notification Preferences */}
      <Section title="Notification Preferences">
        <Toggle on={notifNewMatches} onChange={setNotifNewMatches} label="New matches" />
        <Toggle on={notifPriceDrops} onChange={setNotifPriceDrops} label="Price drops" />
        <Toggle on={notifVisitRemind} onChange={setNotifVisitRemind} label="Site visit reminders" />
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm text-muted-foreground">
            Get alerts on this device even when NxtSft isn’t open.
          </p>
          <PushToggle />
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Current Password
            </label>
            <input
              type="password"
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              New Password
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Confirm Password
            </label>
            <input
              type="password"
              value={confPwd}
              onChange={(e) => setConfPwd(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={() => {
            if (!curPwd || !newPwd || !confPwd) {
              toast.error("Fill all fields");
              return;
            }
            if (newPwd !== confPwd) {
              toast.error("Passwords do not match");
              return;
            }
            toast.success("Password updated");
            setCurPwd("");
            setNewPwd("");
            setConfPwd("");
          }}
          className="mt-4 w-full sm:w-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Update Password
        </button>
      </Section>

      {/* Download data */}
      <Section title="Data & Privacy">
        <p className="mb-3 text-sm text-muted-foreground">
          Download a CSV of the properties you have saved on NxtSft.com Home.
        </p>
        <button
          onClick={handleDownloadCSV}
          className="flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
        >
          <Download size={14} /> Download my data
        </button>
      </Section>
    </>
  );
}
