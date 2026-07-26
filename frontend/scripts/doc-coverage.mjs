/**
 * Documentation coverage reporter.
 *
 * Scans .ts/.tsx files, counts exports vs JSDoc blocks,
 * outputs per-file and aggregate coverage percentages.
 *
 * Usage:
 *   node scripts/doc-coverage.mjs
 *   node scripts/doc-coverage.mjs --json
 *   node scripts/doc-coverage.mjs --minimal
 */

import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC_DIRS = [
  "components",
  "lib",
  "src/shared/hooks",
  "src/domains/sessions/components",
];

const EXPORT_RE =
  /^export\s+(default\s+)?(function|const|type|interface|class|enum|async\s+function)\s+(\w+)/gm;
const JSDOC_RE = /\/\*\*[\s\S]*?\*\//g;

const args = process.argv.slice(2);
const FORMAT_JSON = args.includes("--json");
const FORMAT_MINIMAL = args.includes("--minimal");

function collectFiles(dir) {
  const abs = join(ROOT, dir);
  const results = [];
  try {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const full = join(abs, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith("_")) {
        results.push(...collectFiles(join(dir, entry.name)));
      } else if (
        entry.isFile() &&
        /\.(ts|tsx)$/.test(entry.name) &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".test.tsx") &&
        !entry.name.endsWith(".d.ts")
      ) {
        results.push(full);
      }
    }
  } catch {
    // dir may not exist
  }
  return results;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const jsdocMatches = content.match(JSDOC_RE);
  const jsdocCount = jsdocMatches ? jsdocMatches.length : 0;

  const exportMatches = [];
  let match;
  while ((match = EXPORT_RE.exec(content)) !== null) {
    exportMatches.push({
      isDefault: !!match[1],
      keyword: match[2],
      name: match[3],
    });
  }

  const covered = [];
  const uncovered = [];

  for (let i = 0; i < exportMatches.length; i++) {
    const exp = exportMatches[i];
    const prefix = exp.isDefault ? "export default " : "export ";
    const searchTarget = prefix + exp.keyword + " " + exp.name;
    const pos = content.indexOf(searchTarget);

    if (pos === -1) {
      uncovered.push(exp.name);
      continue;
    }

    if (!jsdocMatches || jsdocMatches.length === 0) {
      uncovered.push(exp.name);
      continue;
    }

    const exportLine = content.slice(0, pos).split("\n").length - 1;
    let hasDoc = false;

    for (let j = 0; j < jsdocMatches.length; j++) {
      const block = jsdocMatches[j];
      const blockStart = content.indexOf(block);
      const blockEnd = blockStart + block.length;
      const lastLineOfBlock =
        content.slice(0, blockEnd).split("\n").length - 1;
      if (lastLineOfBlock >= exportLine - 2 && lastLineOfBlock < exportLine) {
        hasDoc = true;
        break;
      }
    }

    if (hasDoc) {
      covered.push(exp.name);
    } else {
      uncovered.push(exp.name);
    }
  }

  return {
    file: relative(ROOT, filePath),
    exports: exportMatches.length,
    jsdocBlocks: jsdocCount,
    covered: covered.length,
    missing: covered.length === 0 && exportMatches.length > 0,
    exportNames: exportMatches.map((e) => e.name),
    uncoveredNames: uncovered,
  };
}

function main() {
  const files = [];
  for (const dir of SRC_DIRS) {
    files.push(...collectFiles(dir));
  }

  let results = files.map(analyzeFile).filter((r) => r.exports > 0 || r.jsdocBlocks > 0);

  results.sort((a, b) => {
    if (a.missing && !b.missing) return -1;
    if (!a.missing && b.missing) return 1;
    return a.file.localeCompare(b.file);
  });

  const totalExports = results.reduce((s, r) => s + r.exports, 0);
  const totalCovered = results.reduce((s, r) => s + r.covered, 0);
  const totalJsdoc = results.reduce((s, r) => s + r.jsdocBlocks, 0);
  const totalMissing = results.filter((r) => r.missing).length;
  const pct = totalExports > 0 ? Math.round((totalCovered / totalExports) * 100) : 0;

  if (FORMAT_JSON) {
    console.log(JSON.stringify({ results, summary: { totalExports, totalCovered, totalJsdoc, totalMissing, pct } }, null, 2));
    return;
  }

  console.log("\n  Doc Coverage Report\n");

  for (const r of results) {
    const pctFile = r.exports > 0 ? Math.round((r.covered / r.exports) * 100) : 100;
    if (FORMAT_MINIMAL && pctFile === 100) continue;

    const cov = String(r.covered).padStart(2);
    const tot = String(r.exports).padStart(2);
    const pctStr = String(pctFile).padStart(3);
    const marker = pctFile === 100 ? "+" : pctFile >= 66 ? "o" : pctFile >= 33 ? "?" : "-";

    console.log("  " + marker + "  " + cov + "/" + tot + "  " + pctStr + "%  " + r.file);
    for (const name of r.uncoveredNames) {
      if (pctFile < 100) {
        console.log("       -> " + name);
      }
    }
  }

  const sum = totalCovered + "/" + totalExports + " exports with JSDoc = " + pct + "%";
  console.log("\n  " + sum);
  console.log("  " + totalJsdoc + " JSDoc blocks in " + results.length + " files");
  console.log("  " + totalMissing + " file(s) at 0% coverage\n");
}

main();
