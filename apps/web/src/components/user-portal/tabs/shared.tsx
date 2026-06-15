/* Shared helpers and tiny presentational primitives used across user-portal tabs. */

export const DEMO_USER = {
  name: "Ananya Rao",
  email: "ananya@example.com",
  initials: "AR",
  phone: "+91 98xxx 77001",
  city: "Mumbai",
};

export const Head = ({ t, s }: { t: string; s?: string }) => (
  <div className="mb-6">
    <h2 className="font-display text-2xl font-bold text-navy">{t}</h2>
    {s && <p className="mt-1 text-sm text-muted-foreground">{s}</p>}
  </div>
);

export const fmtDur = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

export const fmtPrice = (p: number) =>
  p >= 1e7 ? `₹${(p / 1e7).toFixed(2)} Cr` : p >= 1e5 ? `₹${(p / 1e5).toFixed(1)} L` : `₹${p.toLocaleString("en-IN")}`;

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never";

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
