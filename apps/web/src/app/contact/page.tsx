"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const CONTACTS = [
  {
    label: "Headquarters",
    value: "Cyber City Tower 4, Gurugram 122002, Haryana",
    icon: <MapPin size={18} />,
  },
  {
    label: "Sales",
    value: "+91 1800-NXTSFT-1 · sales@nxtsft.com",
    icon: <Phone size={18} />,
  },
  {
    label: "Support",
    value: "Mon–Sun, 8am–10pm IST · care@nxtsft.com",
    icon: <Clock size={18} />,
  },
  {
    label: "Partnerships",
    value: "developers@nxtsft.com",
    icon: <Mail size={18} />,
  },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  message: string;
};

const EMPTY: FormState = { name: "", email: "", phone: "", city: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [sent, setSent] = useState(false);

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("Enquiry sent! We'll reach out within 24 hours.");
    },
    onError: (err) => {
      toast.error(err.message || "Couldn't send your enquiry. Please try again.");
    },
  });
  const sending = submitMutation.isPending;

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (form.phone && !/^\+?[\d\s\-]{7,15}$/.test(form.phone)) e.phone = "Invalid phone number";
    if (!form.message.trim() || form.message.trim().length < 10) e.message = "At least 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = () => {
    if (!validate()) return;
    submitMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      message: form.message.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.01_260)]">

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="text-xs font-semibold uppercase tracking-widest text-accent">
          Get in touch
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold text-navy sm:text-5xl">
          Let&apos;s talk property.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Whether you&apos;re buying, selling, or partnering — our team is here to help every step of
          the way.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-8 py-16 text-center">
                <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={1.5} />
                <h2 className="font-display text-2xl font-bold text-navy">Message received!</h2>
                <p className="max-w-xs text-muted-foreground">
                  We&apos;ll get back to you at <strong>{form.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => { setForm(EMPTY); setErrors({}); setSent(false); }}
                  className="mt-2 text-sm font-semibold text-accent underline underline-offset-4 hover:opacity-80"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="space-y-5 rounded-2xl border border-border bg-white p-8 shadow-sm">
                <div className="grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      { key: "name", label: "Full name", type: "text", placeholder: "Rahul Sharma" },
                      { key: "email", label: "Email address", type: "email", placeholder: "rahul@example.com" },
                      { key: "phone", label: "Phone number", type: "tel", placeholder: "+91 98765 43210" },
                      { key: "city", label: "City of interest", type: "text", placeholder: "Mumbai, Bengaluru…" },
                    ] as const
                  ).map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}{key === "name" || key === "email" ? " *" : ""}
                      </label>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={set(key)}
                        placeholder={placeholder}
                        className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent/20 ${
                          errors[key]
                            ? "border-rose-400 bg-rose-50 focus:border-rose-400"
                            : "border-border bg-secondary/40 focus:border-accent"
                        }`}
                      />
                      {errors[key] && (
                        <p className="mt-1 text-xs text-rose-600">{errors[key]}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Message *
                  </label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    placeholder="Tell us what you're looking for, or how we can help…"
                    className={`mt-1.5 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent/20 ${
                      errors.message
                        ? "border-rose-400 bg-rose-50 focus:border-rose-400"
                        : "border-border bg-secondary/40 focus:border-accent"
                    }`}
                  />
                  {errors.message && (
                    <p className="mt-1 text-xs text-rose-600">{errors.message}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-display text-sm font-bold text-accent-foreground transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send Enquiry
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  We respond within 24 hours · No spam, ever
                </p>
              </div>
            )}
          </div>

          {/* Contact info */}
          <div className="space-y-4 lg:col-span-2">
            {CONTACTS.map(({ label, value, icon }) => (
              <div
                key={label}
                className="flex gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-accent">
                    {label}
                  </div>
                  <div className="mt-1.5 text-sm text-navy">{value}</div>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-border bg-navy p-6 text-white">
              <div className="text-xs font-semibold uppercase tracking-widest text-gold">
                Response time
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Sales and support queries are answered within <strong className="text-white">4 hours</strong>{" "}
                on business days. For urgent property matters, call our hotline directly.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
