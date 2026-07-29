import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

async function ensureCacheDir() {
  await fs.mkdir(config.cacheDir, { recursive: true });
}

export function hashContent(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function getCachePath(key) {
  return path.join(config.cacheDir, `${key}.mp3`);
}

export async function readCachedMp3(key) {
  try {
    return await fs.readFile(getCachePath(key));
  } catch {
    return null;
  }
}

export async function writeCachedMp3(key, buffer) {
  await ensureCacheDir();
  await fs.writeFile(getCachePath(key), buffer);
}

export async function getOrCreateMp3({ cacheKey, generator }) {
  const cached = await readCachedMp3(cacheKey);
  if (cached) {
    return cached;
  }

  const buffer = await generator();
  await writeCachedMp3(cacheKey, buffer);
  return buffer;
}
