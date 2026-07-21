// optimize-images.mjs
// Reprocesa IN-PLACE las imágenes del bucket "artworks" de Supabase Storage:
// redimensiona y recomprime cada JPEG pesado, reemplazándolo en su mismo path.
// No toca la base de datos ni las URLs (mismo path = misma URL pública).
// Antes de sobrescribir, guarda una copia del original en ./image-backup/.
//
// USO (desde la raíz del repo):
//   1. npm i -D sharp        (supabase-js ya está en el proyecto)
//   2. SUPABASE_URL="https://TUREF.supabase.co" \
//      SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key" \
//      node optimize-images.mjs
//
// La service_role key es sensible: pasala solo en este comando local.
// NO la commitees ni la pegues en ningún lado público.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "ui-assets";          // cambialo si tus imágenes están en otro bucket
const MAX_DIM = 2000;               // lado máximo en px (subí a 2400 si querés más detalle para zoom)
const JPEG_QUALITY = 82;            // 80-85 es el punto dulce calidad/peso
const SKIP_BELOW_BYTES = 1_000_000; // si ya pesa < 1 MB, se asume optimizada y se saltea (permite re-correr)
const CACHE_CONTROL = "31536000";   // 1 año: las imágenes de obras no cambian, conviene cache largo
const BACKUP_DIR = "./image-backup";
const ONLY_JPEG = /\.jpe?g$/i;      // por seguridad solo toca JPEG; PNG/WebP quedan intactos

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const mb = (b) => (b / 1_000_000).toFixed(2) + " MB";

// Lista recursiva del bucket (Supabase pagina de a 100 y no es recursivo solo)
async function listAll(prefix = "") {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = entry.id === null; // carpetas vienen sin id
      if (isFolder) {
        out.push(...(await listAll(path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

async function main() {
  console.log(`Listando bucket "${BUCKET}"…`);
  const all = await listAll();
  const images = all.filter((p) => ONLY_JPEG.test(p));
  console.log(`${images.length} imágenes JPEG encontradas (de ${all.length} archivos).\n`);

  let processed = 0, skipped = 0, failed = 0, saved = 0;

  for (const path of images) {
    try {
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
      if (dlErr) throw dlErr;
      const input = Buffer.from(await blob.arrayBuffer());

      if (input.length < SKIP_BELOW_BYTES) {
        skipped++;
        console.log(`skip   ${path}  (${mb(input.length)}, ya liviana)`);
        continue;
      }

      // Backup local del original ANTES de tocar nada
      const backupPath = join(BACKUP_DIR, path);
      await mkdir(dirname(backupPath), { recursive: true });
      await writeFile(backupPath, input);

      // Comprimir: auto-orienta por EXIF, achica al lado máximo sin agrandar, recomprime
      const output = await sharp(input)
        .rotate()
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();

      if (output.length >= input.length) {
        skipped++;
        console.log(`skip   ${path}  (no mejora)`);
        continue;
      }

      // Resubir al MISMO path (upsert reemplaza el objeto)
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, output, {
        upsert: true,
        contentType: "image/jpeg",
        cacheControl: CACHE_CONTROL,
      });
      if (upErr) throw upErr;

      processed++;
      saved += input.length - output.length;
      console.log(`ok     ${path}  ${mb(input.length)} -> ${mb(output.length)}`);
    } catch (e) {
      failed++;
      console.error(`FALLO  ${path}: ${e?.message || e}`);
    }
  }

  console.log(`\n--- Listo ---`);
  console.log(`Procesadas: ${processed} | Saltadas: ${skipped} | Fallidas: ${failed}`);
  console.log(`Espacio ahorrado en el bucket: ${mb(saved)}`);
  console.log(`Originales respaldados en: ${BACKUP_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
