import { normalizeBaseUrl } from "./normalizeBaseUrl";

export async function listModels(
  endpoint: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(`${normalizeBaseUrl(endpoint)}/v1/models`, {
    signal,
  });
  if (!res.ok) {
    console.error(res.body)
    throw new Error(`Failed to retrieve models from provider (/v1/models): HTTP ${res.status}`);
  };
  const json = (await res.json()) as { data?: Array<{ id?: string }> };
  return (json.data ?? [])
    .map((m) => (typeof m.id === "string" ? m.id : ""))
    .filter(Boolean);
}
