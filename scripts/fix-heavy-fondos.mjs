// scripts/fix-heavy-fondos.mjs
// Descarga los dos PNG fotográficos pesados de ui-assets, los convierte a JPG
// (2560px ancho, quality 82) y guarda el resultado en ./tmp-fondos/.
// NO sube nada a Supabase — subí a mano fondo_jose_2.jpg y fondo_hora.jpg.
//
// USO (desde la raíz del repo):
//   node scripts/fix-heavy-fondos.mjs

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = "./tmp-fondos";
const MAX_WIDTH = 2560;
const JPEG_QUALITY = 82;

const SOURCES = [
  {
    url: "https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/ui-assets/fondo_jose_2.png",
    outName: "fondo_jose_2.jpg",
  },
  {
    url: "https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/ui-assets/fondo_hora.png",
    outName: "fondo_hora.jpg",
  },
];

const kb = (b) => (b / 1000).toFixed(1) + " KB";
const mb = (b) => (b / 1_000_000).toFixed(2) + " MB";

async function convertOne({ url, outName }) {
  console.log(`Descargando ${url}…`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar ${url}`);
  }
  const input = Buffer.from(await res.arrayBuffer());
  console.log(`  origen: ${mb(input.length)}`);

  const output = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const outPath = join(OUT_DIR, outName);
  await writeFile(outPath, output);
  console.log(`  → ${outPath}  ${kb(output.length)} (${mb(output.length)})`);
  if (output.length >= 500_000) {
    console.warn(`  AVISO: ${outName} supera 500 KB`);
  }
  return { outName, bytes: output.length };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const results = [];
  for (const src of SOURCES) {
    results.push(await convertOne(src));
  }
  console.log("\n--- Listo ---");
  for (const r of results) {
    console.log(`${r.outName}: ${kb(r.bytes)}`);
  }
  console.log(`Archivos en ${OUT_DIR}/ — subilos a mano al bucket ui-assets.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
