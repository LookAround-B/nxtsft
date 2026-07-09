"use client";
import { toast } from "sonner";
import { Layers, Home, Building2, Store, MapPin, BedDouble } from "lucide-react";
import { Section } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { ListSkeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";

const TYPE_ICON: Record<string, React.ReactNode> = {
  Apartment: <Building2 size={18} />,
  Villa: <Home size={18} />,
  Studio: <BedDouble size={18} />,
  Office: <Store size={18} />,
  Bungalow: <Home size={18} />,
  Plot: <MapPin size={18} />,
  PG: <BedDouble size={18} />,
};

export function PropertyTypesTab() {
  const utils = trpc.useUtils();
  const typesQ = trpc.admin.propertyTypes.useQuery();

  const toggle = trpc.admin.setPropertyTypeEnabled.useMutation({
    onMutate: async ({ type, enabled }) => {
      await utils.admin.propertyTypes.cancel();
      const prev = utils.admin.propertyTypes.getData();
      utils.admin.propertyTypes.setData(undefined, (old) =>
        old?.map((t) => (t.type === type ? { ...t, enabled } : t)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) utils.admin.propertyTypes.setData(undefined, ctx.prev);
      toast.error(err.message);
    },
    onSuccess: ({ type, enabled }) => {
      toast.success(`${type} ${enabled ? "activated" : "deactivated"}`);
    },
    onSettled: () => {
      utils.admin.propertyTypes.invalidate();
      // Public filter/list forms read a separate query — refresh it too.
      utils.properties.disabledTypes.invalidate();
    },
  });

  const types = typesQ.data ?? [];

  return (
    <>
      <PageHead
        title="Property Types"
        subtitle="Turn property types on or off. Inactive types disappear from the browse filter and the “list your property” form — existing listings are untouched."
      />

      <Section title="Types">
        {typesQ.isLoading && <ListSkeleton rows={5} />}

        {!typesQ.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((t) => (
              <div
                key={t.type}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                  t.enabled ? "border-border bg-white" : "border-dashed border-border bg-secondary/40 opacity-70"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.enabled ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                  {TYPE_ICON[t.type] ?? <Layers size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy">{t.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.count.toLocaleString("en-IN")} live listing{t.count === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={t.enabled}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ type: t.type, enabled: !t.enabled })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                    t.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      t.enabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
