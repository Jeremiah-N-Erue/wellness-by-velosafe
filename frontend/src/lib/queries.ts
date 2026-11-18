import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Country, ProviderProfile, ServiceCategory } from "./types";

/**
 * Shared TanStack Query hooks for public homepage data (Task 4). Caching +
 * stale-while-revalidate here means HomePage and TrustSection can both read
 * the same provider list without triggering duplicate network requests, and
 * a cold Render backend only has to be waited on once per visit.
 */
const STALE_TIME_MS = 60_000;

export function useProvidersQuery() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => api<ProviderProfile[]>("/providers"),
    staleTime: STALE_TIME_MS,
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<ServiceCategory[]>("/categories"),
    staleTime: STALE_TIME_MS,
  });
}

export function useCountriesQuery() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: () => api<Country[]>("/countries"),
    staleTime: STALE_TIME_MS,
  });
}
