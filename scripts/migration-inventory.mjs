import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

const roots = ["supabase/migrations", "migrations"];
const files = [];
for (const root of roots) {
  for (const name of (await readdir(root)).filter((entry) => entry.endsWith(".sql")).sort()) {
    const relativePath = `${root}/${name}`;
    const sql = await readFile(relativePath, "utf8");
    const normalized = sql.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim().toLowerCase();
    const objects = [...sql.matchAll(/\b(?:create|alter)\s+(?:or\s+replace\s+)?(?:table|function|view)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)]
      .map((match) => match[1].toLowerCase());
    files.push({
      path: relativePath,
      root,
      normalizedSha256: createHash("sha256").update(normalized).digest("hex"),
      objects: [...new Set(objects)].sort(),
    });
  }
}

const canonical = files.filter((file) => file.root === roots[0]);
const legacy = files.filter((file) => file.root === roots[1]);
const canonicalObjects = new Set(canonical.flatMap((file) => file.objects));
const exactDuplicates = legacy.flatMap((legacyFile) => canonical
  .filter((canonicalFile) => canonicalFile.normalizedSha256 === legacyFile.normalizedSha256)
  .map((canonicalFile) => [legacyFile.path, canonicalFile.path]));
const objectOverlaps = legacy.flatMap((legacyFile) => legacyFile.objects.flatMap((object) => {
  const canonicalPaths = canonical.filter((file) => file.objects.includes(object)).map((file) => file.path);
  return canonicalPaths.length ? [{ legacyPath: legacyFile.path, object, canonicalPaths }] : [];
}));
const legacyOnly = legacy.map((file) => ({
  path: file.path,
  objectsNotSeenInCanonical: file.objects.filter((object) => !canonicalObjects.has(object)),
})).filter((entry) => entry.objectsNotSeenInCanonical.length > 0);

console.log(JSON.stringify({
  mode: "LOCAL_READ_ONLY",
  canonicalCount: canonical.length,
  legacyCount: legacy.length,
  exactDuplicates,
  objectOverlaps,
  legacyOnly,
  note: "This inventory does not infer or repair remote migration history. Link only staging before running Supabase CLI migration list or db push --dry-run.",
}, null, 2));
