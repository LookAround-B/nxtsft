"use client";
import { toast } from "sonner";
import { Section, Badge } from "@/components/portal/PortalShell";
import { TabHeader } from "./shared";

export function CMSTab() {
  const pages: Array<[string, string, string, string, string]> = [
    ["Home Hero Carousel", "/", "Published", "Aarav K.", "2d ago"],
    ["About — Leadership", "/about", "Published", "Meera I.", "5d ago"],
    ["Contact", "/contact", "Published", "Meera I.", "1w ago"],
    ["Blog: Mumbai 2026 outlook", "/blog/mumbai-2026", "Draft", "Priya S.", "today"],
    ["Builder co-marketing", "/builders", "Scheduled", "Karan J.", "in 2d"],
  ];
  return (
    <>
      <TabHeader
        title="Content CMS"
        subtitle="Marketing pages, blog and hero content."
        action={
          <button
            onClick={() => toast.success("New page draft created")}
            className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-navy-deep hover:opacity-90 transition"
          >
            + New Page
          </button>
        }
      />
      <Section title="Pages">
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="py-2">Title</th>
                <th>Path</th>
                <th>Status</th>
                <th>Editor</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(([t, p, s, e, u]) => (
                <tr key={t}>
                  <td className="font-semibold text-navy">{t}</td>
                  <td className="font-mono text-xs">{p}</td>
                  <td>
                    <Badge tone={s === "Published" ? "success" : s === "Draft" ? "warm" : "new"}>
                      {s}
                    </Badge>
                  </td>
                  <td className="text-xs">{e}</td>
                  <td className="text-xs text-muted-foreground">{u}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
