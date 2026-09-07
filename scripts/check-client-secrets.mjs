import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await check(file); continue; }
    if (!/\.(js|json|map|html)$/.test(file)) continue;
    const source = await readFile(file, "utf8");
    const privilegedJwt = [...source.matchAll(/eyJ[\w-]+\.([\w-]+)\.[\w-]+/g)].some(match => {
      try { return JSON.parse(Buffer.from(match[1], "base64url").toString()).role === "service_role"; }
      catch { return false; }
    });
    if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(source) || privilegedJwt) {
      // Report the filename, never the credential.
      throw new Error(`Privileged credential in client asset: ${file}`);
    }
  }
}
await check(".next/static");
console.log("Client assets contain no recognized privileged credentials.");
