export const POLICY_VERSIONS = {
  terms: "2026-08-22",
  privacy: "2026-08-22",
} as const;

export const POLICY_PUBLISHED_DATE = "22 August 2026";
export const POLICY_CONSENT_STATUS = 428;

export const POLICY_ROUTES = {
  terms: "/terms",
  privacy: "/privacy",
  consent: "/consent",
} as const;

export type PolicyConsentRow = {
  terms_version?: string | null;
  privacy_version?: string | null;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
};

export function hasCurrentPolicyConsent(row?: PolicyConsentRow | null) {
  return Boolean(row?.terms_version === POLICY_VERSIONS.terms && row?.privacy_version === POLICY_VERSIONS.privacy && row?.terms_accepted_at && row?.privacy_accepted_at);
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/") || /[\\\\\u0000-\u001f\u007f]/.test(value)) return "/home";
  return value;
}
