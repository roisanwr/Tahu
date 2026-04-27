/**
 * lib/api.ts — Tahu API Client
 * Centralized fetch utility untuk semua panggilan ke backend FastAPI.
 * Semua fungsi return typed response atau null jika gagal.
 */

import { API_BASE_URL } from "./supabase";

// ── Types ─────────────────────────────────────────────────────

export interface BusinessResponse {
  id: string;
  business_name: string;
  category: string | null;
  owner_name: string | null;
  description: string | null;
  is_active: boolean;
  session_attempt_count: number;
  created_at: string;
}

export interface AssessmentSummary {
  id: string;              // session id
  created_at: string;
  status: string;
  mode: string;
  credit_assessments: CreditAssessment | null;
}

export interface CreditAssessment {
  final_score: number;
  risk_level: string;
  data_flag: string;
  loan_eligible: boolean;
  loan_max_amount: number | null;
  loan_tenor_months: number | null;
  loan_interest_range: string | null;
  score_financial: number | null;
  score_collateral: number | null;
  score_experience: number | null;
  score_location: number | null;
  score_character: number | null;
  raw_scores: RawScores | null;
  weights: Record<string, number> | null;
  confidence_multipliers: Record<string, number> | null;
  gcs: number | null;
  fraud_flag: boolean;
  hard_block_triggered: boolean;
  hard_block_reason: string | null;
  created_at: string;
}

export interface RawScores {
  financial: { F1: number; F2: number; F3: number | null; S_financial: number };
  collateral: { C1: number; C2: number; S_collateral: number };
  experience: { E1: number; E2: number; E3: number; S_experience: number };
  location: { L1: number; L2: number; L3: number; S_location: number };
  character: { CH1: number; CH2: number; CH3: number; S_character: number };
}

export interface SessionResponse {
  session_id: string;
  business_id: string;
  user_id: string;
  status: string;
  mode: string;
  interview_stage: string;
  progress_pct: number;
  contradiction_count: number;
  financial_snapshot: Record<string, unknown> | null;
  created_at: string;
  last_active_at: string | null;
}

// ── Helper ─────────────────────────────────────────────────────

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders(token),
        ...(options?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[API] ${path} → ${res.status}`, err);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (e) {
    console.error(`[API] ${path} fetch failed:`, e);
    return null;
  }
}

// ── API Functions ─────────────────────────────────────────────

/** Ambil semua bisnis milik user (yang paling baru di index 0) */
export async function listBusinesses(token: string): Promise<BusinessResponse[]> {
  const result = await apiFetch<BusinessResponse[]>("/businesses", token);
  return result ?? [];
}

/** Ambil semua assessment history untuk satu bisnis */
export async function getBusinessAssessments(
  businessId: string,
  token: string
): Promise<AssessmentSummary[]> {
  const result = await apiFetch<AssessmentSummary[]>(
    `/businesses/${businessId}/assessments`,
    token
  );
  return result ?? [];
}

/** Ambil detail satu session */
export async function getSession(
  sessionId: string,
  token: string
): Promise<SessionResponse | null> {
  return apiFetch<SessionResponse>(`/sessions/${sessionId}`, token);
}

/** Ambil detail satu bisnis */
export async function getBusiness(
  businessId: string,
  token: string
): Promise<BusinessResponse | null> {
  return apiFetch<BusinessResponse>(`/businesses/${businessId}`, token);
}
