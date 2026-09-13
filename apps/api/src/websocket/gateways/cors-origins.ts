export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || raw.trim() === '') {
    return [];
  }
  return raw.split(',').map((o) => o.trim()).filter((o) => o.length > 0);
}
