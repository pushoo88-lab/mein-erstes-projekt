// Startet alle Tests der Rechenwiese (tests/*.test.mjs) und zeigt am Ende eine Übersicht.
//   node tests/alle.mjs            alle Tests
//   node tests/alle.mjs pruefung   nur Tests, deren Name das Wort enthält
// Je zwei Tests laufen gleichzeitig. Ein Test, der länger als 10 Minuten braucht, gilt als fehlgeschlagen.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const filter = process.argv.slice(2);
const files = readdirSync(here).filter((f) => f.endsWith(".test.mjs") && (!filter.length || filter.some((w) => f.includes(w)))).sort();
const results = [];

function run(file) {
  return new Promise((ok) => {
    const t0 = Date.now(), child = spawn(process.execPath, [join(here, file)], { cwd: join(here, "..") });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => { out += "\n  ✗ abgebrochen nach 10 Minuten"; child.kill("SIGKILL"); }, 10 * 60 * 1000);
    child.on("close", (code) => {
      clearTimeout(timer);
      const r = { file, ok: code === 0, secs: Math.round((Date.now() - t0) / 1000), out };
      console.log(`\n── ${file} (${r.secs} s) ${r.ok ? "✓" : "✗"}\n${out.trimEnd()}`);
      results.push(r); ok();
    });
  });
}

const queue = [...files];
await Promise.all([0, 1].map(async () => { while (queue.length) await run(queue.shift()); }));

console.log("\n══ Übersicht");
for (const r of results.sort((a, b) => a.file.localeCompare(b.file))) {
  const fails = (r.out.match(/✗/g) || []).length;
  console.log(`${r.ok ? "✓" : "✗"} ${r.file.replace(".test.mjs", "").padEnd(12)} ${String(r.secs).padStart(4)} s${r.ok ? "" : `  ${fails || "?"} Fehler`}`);
}
const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `\n${bad} von ${results.length} Tests fehlgeschlagen.` : `\nAlle ${results.length} Tests in Ordnung.`);
process.exit(bad ? 1 : 0);
