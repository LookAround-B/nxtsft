import Link from "next/link";
import Image from "next/image";
import { CATEGORIES } from "@/components/home/homeData";
import { Eyebrow } from "@/components/home/Eyebrow";

export function CategoriesSection() {
  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5" data-reveal>
            <Eyebrow>Browse by Type</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-black text-navy sm:text-2xl">
              Top Categories
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6">
            {CATEGORIES.map(({ label, Icon, type, image }, i) => (
              <Link
                key={label}
                href={`/properties?type=${encodeURIComponent(type)}`}
                data-reveal="scale"
                className="group relative flex flex-col items-center justify-end overflow-hidden rounded-2xl border border-border text-center transition hover:-translate-y-1 hover:shadow-lg"
                style={{ transitionDelay: `${i * 55}ms`, minHeight: "120px" }}
              >
                {image ? (
                  <>
                    <Image
                      src={image}
                      alt={label}
                      fill
                      sizes="(max-width: 768px) 33vw, 16vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="relative z-10 mb-3 px-2 font-display text-[11px] font-bold leading-tight text-white drop-shadow sm:text-xs">
                      {label}
                    </span>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary/40 p-4 transition group-hover:border-accent/40 sm:gap-3 sm:p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
                      <Icon size={18} strokeWidth={1.75} className="sm:hidden" />
                      <Icon size={22} strokeWidth={1.75} className="hidden sm:block" />
                    </span>
                    <span className="font-display text-[11px] font-bold leading-tight text-navy sm:text-sm">
                      {label}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
