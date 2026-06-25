import type { JwtClaims } from "~/types/platform";
import { jwtDecode } from "jwt-decode";

export function getApiBaseUrl() {
  return String(useRuntimeConfig().public.apiBaseUrl ?? "http://localhost:8080");
}

export function toFriendlyApiErrorMessage(error: unknown, fallback: string) {
  const e = error as {
    statusCode?: number;
    status?: number;
    data?: unknown;
    message?: string;
  };

  const statusCode = e?.statusCode ?? e?.status;
  const message = String(e?.message ?? "");
  const data = e?.data;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Sem ligação à internet. Verifique a sua conexão e tente novamente.";
  }

  if (
    message.includes("NetworkError") ||
    message.includes("Failed to fetch") ||
    message.includes("<no response>")
  ) {
    return `Não foi possível conectar à API (${getApiBaseUrl()}). Verifique se o backend está ativo.`;
  }

  if (statusCode === 401) {
    return "Credenciais inválidas. Verifique e tente novamente.";
  }

  if (typeof data === "string" && data.trim().length > 0) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof (data as { message?: unknown }).message === "string"
  ) {
    return String((data as { message: string }).message);
  }

  if (data && typeof data === "object") {
    const values = Object.values(data as Record<string, unknown>);
    const firstString = values.find(
      (value) => typeof value === "string" && value.trim().length > 0,
    ) as string | undefined;

    if (firstString) {
      return firstString;
    }
  }

  return fallback;
}

export function decodeJwtExp(token: string | null): number | null {
  if (!token) return null;
  try {
    const claims = jwtDecode<JwtClaims>(token);
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}
