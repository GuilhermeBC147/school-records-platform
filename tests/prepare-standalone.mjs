import { cp, mkdir, rm, stat } from "node:fs/promises";

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

await mkdir(".next/standalone/.next", { recursive: true });
await rm(".next/standalone/.next/static", { force: true, recursive: true });
await cp(".next/static", ".next/standalone/.next/static", {
  force: true,
  recursive: true,
});

if (await pathExists("public")) {
  await rm(".next/standalone/public", { force: true, recursive: true });
  await cp("public", ".next/standalone/public", {
    force: true,
    recursive: true,
  });
}
