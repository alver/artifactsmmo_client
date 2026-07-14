// Low-level HTTP client for the ArtifactsMMO API.
//
// Ported from the original single-file client (web/index.html:341-390), which was
// the one piece worth keeping. It handles the two things every caller would
// otherwise repeat: rate-limit backoff (HTTP 429) and the game's cooldown error
// (code 499), plus pagination. `api()` returns the unwrapped `data` payload.

import { devlog } from "../lib/devlog";
import type { Paginated } from "../types/api";

export const API_BASE = "https://api.artifactsmmo.com";

/** Compact request-body rendering for the dev log (never the token). */
const short = (v: unknown): string => {
  if (v === undefined) return "";
  const s = JSON.stringify(v);
  return " " + (s.length > 160 ? s.slice(0, 157) + "…" : s);
};
const TOKEN_KEY = "ammo:v1:token";

let _token = localStorage.getItem(TOKEN_KEY) || import.meta.env.TOKEN || "";

export function getToken(): string {
  return _token;
}

export function setToken(t: string): void {
  _token = t.trim();
  if (_token) localStorage.setItem(TOKEN_KEY, _token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return _token.length > 0;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class ApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

function authHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(_token ? { Authorization: "Bearer " + _token } : {}),
  };
}

function retryAfterMs(resp: Response): number {
  return ((parseFloat(resp.headers.get("Retry-After") || "1") || 1) + 0.25) * 1000;
}

export interface ApiOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  retries?: number;
}

/**
 * Make one API request, retrying transient conditions.
 *  - 429 → wait `Retry-After`, retry
 *  - 499 (still on cooldown) → parse the seconds out of the message, wait, retry
 *  - 461 (another character's bank transaction in flight) → wait a beat, retry
 * Returns `payload.data` (or the whole payload if there is no `data`).
 */
export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, retries = 4 } = opts;
  const url = API_BASE + path;
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await fetch(url, {
      method,
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 429) {
      await sleep(retryAfterMs(resp));
      continue;
    }
    const payload = (await resp.json().catch(() => ({}))) as {
      data?: T;
      error?: { code?: number; message?: string };
    };
    if (payload.error) {
      const code = payload.error.code || resp.status;
      const msg = payload.error.message || "API error";
      devlog(`api ${method} ${path}${short(body)} -> ${code} ${msg}`);
      // 461 is momentary lock contention when several of the account's
      // characters bank at once — same wait-and-retry treatment as cooldown.
      if ((code === 499 || code === 461) && attempt < retries - 1) {
        const m = /([\d.]+)\s*second/.exec(msg);
        await sleep(((m ? parseFloat(m[1]) : 2) + 0.3) * 1000);
        continue;
      }
      throw new ApiError(msg, code);
    }
    devlog(`api ${method} ${path}${short(body)} -> ok`);
    return (payload.data !== undefined ? payload.data : (payload as unknown)) as T;
  }
  throw new ApiError("too many retries", 0);
}

/** Fetch and concatenate every page of a paginated collection. */
export async function getAllPages<T = unknown>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const all: T[] = [];
  const size = Number(params.size) || 100;
  let page = 1;
  for (;;) {
    const qs = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      size: String(size),
      page: String(page),
    }).toString();
    const resp = await fetch(`${API_BASE}${path}?${qs}`, { headers: authHeaders() });
    if (resp.status === 429) {
      await sleep(retryAfterMs(resp));
      continue;
    }
    const pl = (await resp.json()) as Paginated<T> & { error?: { code?: number; message?: string } };
    if (pl.error) throw new ApiError(pl.error.message || "API error", pl.error.code || resp.status);
    all.push(...(pl.data || []));
    if (page >= (pl.pages || 1)) return all;
    page++;
  }
}
