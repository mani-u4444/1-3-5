import type { Concept } from "./types";

const API_URL_KEY = "study-prep-api-url";

export function getApiUrl(): string {
  return localStorage.getItem(API_URL_KEY) || "";
}

export function setApiUrl(url: string) {
  localStorage.setItem(API_URL_KEY, url);
}

export function hasApiUrl(): boolean {
  return !!getApiUrl();
}

async function apiCall(params: Record<string, string>): Promise<any> {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error("API URL not configured");

  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function fetchConcepts(): Promise<Concept[]> {
  const data = await apiCall({ action: "getAll" });
  return Array.isArray(data) ? data : [];
}

export async function addConceptApi(
  title: string,
  description: string,
  learnedDate: string
): Promise<Concept> {
  return apiCall({
    action: "add",
    title,
    description,
    learnedDate,
  });
}

export async function updateConceptApi(
  id: string,
  field: "recapDay3Done" | "recapDay7Done",
  value: boolean
): Promise<void> {
  await apiCall({
    action: "update",
    id,
    field,
    value: String(value),
  });
}

export async function deleteConceptApi(id: string): Promise<void> {
  await apiCall({
    action: "delete",
    id,
  });
}
