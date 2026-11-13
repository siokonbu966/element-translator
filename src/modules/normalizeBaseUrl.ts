export function normalizeBaseUrl(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
}
