"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpcClient } from "./trpcClient";

interface AppData {
  agents: any[];
  isLoading: boolean;
}

const DataContext = createContext<AppData>({
  agents: [],
  isLoading: true,
});

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    agents: [],
    isLoading: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const agentsData = await (trpcClient.users.getAgents.query() as Promise<any[]>);

        const agents = agentsData.map((a) => ({
          name: a.name,
          initials:
            a.metadata?.initials ||
            a.name
              .split(" ")
              .map((n: string) => n[0])
              .join(""),
          role: "RERA Agent",
          rating: a.metadata?.rating || 4.5,
          reviews: a.metadata?.reviews || 0,
          deals: a.metadata?.deals || 0,
          listings: a.metadata?.listings || 0,
          since: a.metadata?.since || 2020,
          cities: [a.city],
          specialties: ["Residential", "Luxury"],
          languages: ["English", "Hindi"],
          verified: a.verified,
          featured: Math.random() > 0.7,
          color: ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-rose-600"][
            Math.floor(Math.random() * 4)
          ],
          responseTime: "< 1 hr",
          portfolioValue: "₹25 Cr+",
        }));

        setData({ agents, isLoading: false });
      } catch (err) {
        console.error("Failed to load app data:", err);
        setData((p) => ({ ...p, isLoading: false }));
      }
    };

    loadData();
  }, []);

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export const useAppData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
};

export const useAgents = () => {
  const { agents, isLoading } = useAppData();
  return { agents, isLoading };
};

export const useTeamMembers = () => {
  const { isLoading } = useAppData();
  return { members: [] as any[], isLoading };
};
