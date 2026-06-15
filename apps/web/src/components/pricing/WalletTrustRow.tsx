import { Zap, Shield, PhoneCall } from "lucide-react";

export function WalletTrustRow() {
  const items = [
    {
      icon: <Zap size={20} className="text-gold" />,
      title: "Token Wallet System",
      desc: "Credits are stored in your wallet. Use them any time within validity — no lock-in per property.",
    },
    {
      icon: <Shield size={20} className="text-accent" />,
      title: "One-click Dispute Refund",
      desc: "If a contact is unreachable or incorrect, raise a dispute in one tap and get your credit back within 24 hrs.",
    },
    {
      icon: <PhoneCall size={20} className="text-emerald-500" />,
      title: "WhatsApp Alerts",
      desc: "Get instant WhatsApp notifications when owners respond or new matching listings go live.",
    },
  ];
  return (
    <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
              <div className="font-display text-sm font-bold text-navy">{title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
