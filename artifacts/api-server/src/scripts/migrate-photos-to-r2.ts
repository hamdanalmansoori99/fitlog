/**
 * One-time migration: moves existing base64 progress photos to Cloudflare R2.
 *
 * Usage:
 *   node --env-file=.env --import tsx/esm ./src/scripts/migrate-photos-to-r2.ts
 *
 * For each photo that still has imageData but no r2Key:
 *   1. Upload base64 → R2 as `progress/{userId}/{photoId}.{ext}`
 *   2. Set r2Key on the row
 *   3. Null out imageData to free DB storage
 */
import { db, progressPhotosTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { uploadToR2 } from "../lib/r2";

async function migrate() {
  const photos = await db
    .select()
    .from(progressPhotosTable)
    .where(isNull(progressPhotosTable.r2Key));

  console.log(`Found ${photos.length} photos to migrate`);

  let success = 0;
  let failed = 0;

  for (const photo of photos) {
    if (!photo.imageData) {
      console.log(`  [skip] photo ${photo.id} — no imageData`);
      continue;
    }
    try {
      const ext = photo.mimeType === "image/png" ? "png" : "jpg";
      const key = `progress/${photo.userId}/${photo.id}.${ext}`;
      const buffer = Buffer.from(photo.imageData, "base64");

      await uploadToR2(key, buffer, photo.mimeType);

      await db
        .update(progressPhotosTable)
        .set({ r2Key: key, imageData: null })
        .where(eq(progressPhotosTable.id, photo.id));

      success++;
      console.log(`  [ok] photo ${photo.id} → ${key}`);
    } catch (err) {
      failed++;
      console.error(`  [fail] photo ${photo.id}:`, err);
    }
  }

  console.log(`\nDone. ${success} migrated, ${failed} failed.`);
  process.exit(0);
}

migrate();
