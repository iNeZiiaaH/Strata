"use client";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("strata_api_key") || "";
}

export function setApiKey(key: string): void {
  localStorage.setItem("strata_api_key", key);
}

export function clearApiKey(): void {
  localStorage.removeItem("strata_api_key");
}
