import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const assetsDir = path.join(distDir, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error("dist/assets not found at: " + assetsDir);
  process.exit(1);
}

const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));

const chunkData = jsFiles.map((file) => {
  const filePath = path.join(assetsDir, file);
  const content = fs.readFileSync(filePath);
  const size = content.length;
  const gzipSize = zlib.gzipSync(content).length;
  const isMain = file.startsWith("index-");
  return {
    file,
    sizeBytes: size,
    sizeKb: (size / 1024).toFixed(2),
    gzipBytes: gzipSize,
    gzipKb: (gzipSize / 1024).toFixed(2),
    type: isMain ? "Initial / Main" : "Route-Split (Lazy)"
  };
}).sort((a, b) => b.sizeBytes - a.sizeBytes);

console.log("================================================================================");
console.log("                           PRODUCTION CHUNKS REPORT                             ");
console.log("================================================================================");
console.log(`Rank  ${"Chunk Filename".padEnd(36)} ${"Type".padEnd(20)} ${"Minified".padStart(10)} ${"Gzip".padStart(10)}`);
console.log("--------------------------------------------------------------------------------");

chunkData.forEach((c, idx) => {
  const rank = (idx + 1).toString().padStart(2, " ");
  console.log(`${rank}.   ${c.file.padEnd(36)} ${c.type.padEnd(20)} ${(c.sizeKb + " kB").padStart(10)} ${(c.gzipKb + " kB").padStart(10)}`);
});

console.log("--------------------------------------------------------------------------------");
const totalBytes = chunkData.reduce((acc, c) => acc + c.sizeBytes, 0);
const totalGzip = chunkData.reduce((acc, c) => acc + c.gzipBytes, 0);
const mainChunk = chunkData.find((c) => c.type.startsWith("Initial"));
console.log(`Total JS Chunks: ${chunkData.length}`);
console.log(`Initial Entry Chunk: ${mainChunk?.file} (${mainChunk?.sizeKb} kB minified | ${mainChunk?.gzipKb} kB gzip)`);
console.log(`Total Code-Split JS Size: ${(totalBytes / 1024).toFixed(2)} kB minified | ${(totalGzip / 1024).toFixed(2)} kB gzip`);
console.log("================================================================================");
