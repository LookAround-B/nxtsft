import { PRESS } from "@/components/home/homeData";

export function PressBand() {
  return (
    <section className="overflow-hidden border-y border-border bg-white py-5">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "marquee 42s linear infinite", width: "max-content" }}
      >
        {[...PRESS, ...PRESS].map((item, i) => (
          <div
            key={i}
            className="inline-flex shrink-0 items-center gap-3 border-r border-border px-8"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-accent">
              {item.outlet}
            </span>
            <span className="text-sm text-muted-foreground">&ldquo;{item.headline}&rdquo;</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}
