const PRODUCTION_SITE_ORIGIN = "https://www.chaptr.space";
const LOCAL_SITE_ORIGIN = "http://localhost:3000";

function normalizeOrigin(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).origin;
}

export function siteOrigin() {
  // OAuth PKCE stores its verifier on the hostname that starts the flow.
  // Keep browser-generated callbacks on that exact origin so a platform-level
  // apex/www redirect cannot separate the verifier from the callback request.
  if (typeof window !== "undefined") return window.location.origin;

  if (process.env.NODE_ENV === "production") return PRODUCTION_SITE_ORIGIN;

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeOrigin(configured);
  return LOCAL_SITE_ORIGIN;
}

export function siteUrl(path: string) {
  return new URL(path, `${siteOrigin()}/`).toString();
}

export const productionSiteOrigin = PRODUCTION_SITE_ORIGIN;
