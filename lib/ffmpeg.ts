"use client";

import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg() {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (!loadingPromise) {
    loadingPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return loadingPromise;
}

export function safeFileName(input: string, fallback = "output") {
  const withoutExt = input.replace(/\.[^/.]+$/, "");
  const clean = withoutExt.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 48);
  return clean || fallback;
}

export async function writeInputFile(ffmpeg: FFmpeg, virtualName: string, file: File) {
  await ffmpeg.writeFile(virtualName, await fetchFile(file));
}

export function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
