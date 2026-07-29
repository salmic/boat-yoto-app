import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { EdgeTTS } from "node-edge-tts";
import { config } from "../config.js";

export async function synthesizeMp3(text) {
  const tempDir = path.join(os.tmpdir(), "boat-scanner-tts");
  await fs.mkdir(tempDir, { recursive: true });

  const tempFile = path.join(
    tempDir,
    `${crypto.randomBytes(8).toString("hex")}.mp3`
  );

  const tts = new EdgeTTS({
    voice: config.ttsVoice,
    lang: "en-US",
    outputFormat: "audio-24khz-96kbitrate-mono-mp3",
    timeout: 30000,
  });

  try {
    await tts.ttsPromise(text, tempFile);
    return await fs.readFile(tempFile);
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}

export function estimateDurationSeconds(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(8, Math.ceil(words / 2.5));
}

export function estimateFileSize(durationSeconds) {
  return Math.max(64000, durationSeconds * 16000);
}
