export const instagramUrl = (handle?: string | null) =>
  handle ? `https://instagram.com/${handle.replace(/^@/, "")}` : null;
