import { useEffect, useState } from "react";
import { trpcClient } from "./trpcClient";

// Hook to fetch agents from DB
export const useAgents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await trpcClient.users.getAgents.query();
        setAgents(
          data.map((a) => {
            const meta = (a.metadata as Record<string, unknown> | null) ?? {};
            return {
              name: a.name,
              initials: (meta.initials as string | undefined) || a.name.split(" ").map((n: string) => n[0]).join(""),
              role: "RERA Agent",
              rating: (meta.rating as number | undefined) ?? 4.5,
              reviews: (meta.reviews as number | undefined) ?? 0,
              deals: (meta.deals as number | undefined) ?? 0,
              listings: (meta.listings as number | undefined) ?? 0,
              since: (meta.since as number | undefined) ?? 2020,
              cities: [a.city],
              specialties: ["Residential"],
              languages: ["English", "Hindi"],
              verified: a.verified,
              featured: false,
              color: "bg-blue-600",
              responseTime: "< 1 hr",
              portfolioValue: "₹25 Cr+",
            };
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch agents");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { agents, isLoading, error };
};

// Hook to fetch team members from DB
export const useTeamMembers = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await trpcClient.users.getTeamMembers.query();
        setMembers(
          data.map((m: { id: string; name: string; city: string }) => ({
            id: m.id,
            name: m.name,
            role: "Sales Rep",
            city: m.city,
            leadsOpen: 14,
            closedMTD: 4,
            conversion: 28,
            target: 100,
            achieved: 72,
          })),
        );
      } catch (err) {
        console.error("Failed to fetch team members:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { members, isLoading };
};

// Hook to fetch reviews for a property
export const usePropertyReviews = (propertyId: string) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    (async () => {
      try {
        const data = await trpcClient.reviews.list.query({
          propertyId,
          limit: 10,
        });
        setReviews(data.items);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [propertyId]);

  return { reviews, isLoading };
};

// Hook to fetch listings for a property
export const usePropertyListings = (propertyId: string) => {
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    (async () => {
      try {
        const data = await trpcClient.listings.byProperty.query({ propertyId });
        setListings(data);
      } catch (err) {
        console.error("Failed to fetch listings:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [propertyId]);

  return { listings, isLoading };
};
