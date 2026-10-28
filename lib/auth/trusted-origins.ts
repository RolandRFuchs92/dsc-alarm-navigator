// Extra origins (besides BETTER_AUTH_URL) the app may be opened from, e.g. a phone on the LAN
// hitting the dev server by IP. Comma-separated full origins: http://192.168.10.177:3001
function listTrustedOrigins(raw: string | undefined): string[] {
  const parts = (raw ?? "").split(",").map((p) => p.trim()).filter((p) => p !== "");
  const result = parts.map((p) => {
    if (!URL.canParse(p)) throw new Error(`TRUSTED_ORIGINS: "${p}" is not a URL like http://192.168.10.177:3001`);
    return new URL(p).origin;
  });
  return result;
}

// Next's dev server wants bare host names for allowedDevOrigins.
function listDevHosts(raw: string | undefined): string[] {
  const result = listTrustedOrigins(raw).map((o) => new URL(o).hostname);
  return result;
}

export { listTrustedOrigins, listDevHosts };
