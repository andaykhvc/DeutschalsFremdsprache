export async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(
    `/api/diary/${path}`,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : { cache: "no-store" },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "Das hat nicht geklappt. Bitte erneut versuchen.",
    );
  return result;
}
