"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Headphones, MapPin, Languages, Clock, Building2, PhoneCall, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CONSULTANT_LANGUAGES,
  CONSULTANT_PROPERTY_TYPES,
  CONSULTANT_RESPONSE,
  CONSULTANT_STATES,
  consultantsForState,
  type VirtualConsultant,
} from "@/data/virtualConsultants";

// Card gradients cycle so a state's 10 consultants don't look like clones.
const GRADIENTS = [
  "from-teal-500 to-emerald-600",
  "from-indigo-500 to-violet-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
  "from-rose-500 to-pink-600",
];

/**
 * NxtSft's Virtual Property Consultant desk: 10 named consultants per state.
 * Deliberately no ratings, reviews, RERA badges or deal/revenue figures — these
 * are our team's desk names, not independently verified agents. The only
 * action is a real callback request, which lands as an unassigned lead.
 */
export function VirtualConsultantDesk({ defaultState = "Karnataka" }: { defaultState?: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [state, setState] = useState(CONSULTANT_STATES.includes(defaultState) ? defaultState : "Karnataka");
  const consultants = useMemo(() => consultantsForState(state), [state]);
  const [target, setTarget] = useState<VirtualConsultant | null>(null);
  const [phone, setPhone] = useState("");

  const request = trpc.leads.requestConsultantCallback.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.duplicate
          ? "You already have a callback request for this state. We'll call you today."
          : `Done! ${target?.name.split(" ")[0]} will call you back today.`,
      );
      setTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const open = (c: VirtualConsultant) => {
    if (!session) {
      router.push(`/login?redirect=${encodeURIComponent("/agents#virtual-consultants")}`);
      return;
    }
    setPhone((session.phone ?? "").replace(/\D/g, "").slice(-10));
    setTarget(c);
  };

  return (
    <section id="virtual-consultants" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
            <Headphones size={12} /> NxtSft Virtual Consultant Desk
          </div>
          <h2 className="mt-3 font-display text-2xl font-black text-navy sm:text-3xl">
            Talk to a Virtual Property Consultant in your state
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Our consultants cover all 36 states and union territories. Request a callback and one of
            them will call you the same day, in English or Hindi.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your state</label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSULTANT_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {consultants.map((c, i) => (
          <article
            key={c.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={`h-16 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]}`} />
            <div className="-mt-9 flex flex-1 flex-col px-4 pb-4">
              <div className="relative w-fit">
                <div
                  className={`grid h-16 w-16 place-items-center rounded-2xl border-4 border-white bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} font-display text-xl font-black text-white shadow-md`}
                >
                  {c.initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" title="Available today" />
              </div>
              <h3 className="mt-3 font-display text-base font-bold leading-tight text-navy">{c.name}</h3>
              <div className="mt-1 text-[11px] font-semibold text-accent">Virtual Property Consultant</div>

              <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin size={13} className="mt-0.5 shrink-0 text-accent" />
                <div className="flex flex-wrap gap-1">
                  {c.cities.map((city) => (
                    <span key={city} className="rounded-md bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 size={13} className="shrink-0 text-accent" /> {CONSULTANT_PROPERTY_TYPES.join(" · ")}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Languages size={13} className="shrink-0 text-accent" /> {CONSULTANT_LANGUAGES.join(" · ")}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={13} className="shrink-0 text-accent" /> {CONSULTANT_RESPONSE}
              </div>

              <button
                onClick={() => open(c)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-3 py-2.5 text-sm font-bold text-white transition group-hover:bg-accent"
              >
                <PhoneCall size={14} /> Request a callback
              </button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Request a callback from {target?.name}</DialogTitle>
          <DialogDescription>
            A Virtual Property Consultant for {target?.state} will call you back today, in English or Hindi.
          </DialogDescription>
          <label className="mt-2 block text-sm font-semibold text-foreground">Your mobile number</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            className="mt-1.5 w-full rounded-xl border border-input px-3.5 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <button
            disabled={phone.length !== 10 || request.isPending}
            onClick={() =>
              target && request.mutate({ consultantName: target.name, state: target.state, phone })
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {request.isPending ? <Loader2 size={15} className="animate-spin" /> : <PhoneCall size={15} />}
            Call me back today
          </button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
