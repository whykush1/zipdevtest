"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import QRCode from "qrcode";
import { FileDropzone } from "@/components/file-dropzone";
import { ToolShell } from "@/components/tool-shell";
import { getFFmpeg, humanFileSize, safeFileName, writeInputFile } from "@/lib/ffmpeg";
import { TOOL_BY_SLUG } from "@/lib/tools";

type Output = {
  blob: Blob;
  name: string;
  type: string;
};

const FILE_LIMITS_MB = {
  media: 300,
  audio: 200,
  image: 50,
  gifFrame: 20,
  pdf: 50,
  zip: 100,
} as const;

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function ffmpegDataToBlob(data: Uint8Array, type: string) {
  return new Blob([Uint8Array.from(data)], { type });
}

function useObjectUrl(source: Blob | null) {
  const url = useMemo(() => (source ? URL.createObjectURL(source) : ""), [source]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}

function Progress({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-zinc-600">Progress: {progress}%</p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

function OutputPanel({ output }: { output: Output | null }) {
  const url = useObjectUrl(output?.blob ?? null);
  if (!output) return null;

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-medium text-green-800">Ready: {output.name}</p>
      <p className="text-xs text-green-700">{humanFileSize(output.blob.size)}</p>
      {output.type.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Output preview" className="mt-3 max-h-56 rounded-lg" />
      ) : null}
      <button
        type="button"
        onClick={() => downloadBlob(output.blob, output.name)}
        className="mt-3 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
      >
        Download
      </button>
    </div>
  );
}

function useWorkerState() {
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<Output | null>(null);

  return {
    isWorking,
    setIsWorking,
    progress,
    setProgress,
    error,
    setError,
    output,
    setOutput,
  };
}

function ImagePreview({ file }: { file: File | null }) {
  const url = useObjectUrl(file);
  if (!file || !url) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Input preview" className="max-h-56 rounded-lg" />;
}

function VideoPreview({ file }: { file: File | null }) {
  const url = useObjectUrl(file);
  if (!file || !url) return null;

  return <video className="max-h-56 rounded-lg" controls src={url} />;
}

function AudioPreview({ file }: { file: File | null }) {
  const url = useObjectUrl(file);
  if (!file || !url) return null;

  return <audio className="w-full" controls src={url} />;
}

function validateSize(file: File, maxMb: number = FILE_LIMITS_MB.media) {
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`File is too large. Please use files under ${maxMb}MB for browser processing.`);
  }
}

function VideoCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState("medium");
  const [format, setFormat] = useState("mp4");
  const state = useWorkerState();

  const run = async () => {
    if (!file) return;

    try {
      state.setError("");
      state.setOutput(null);
      state.setIsWorking(true);
      state.setProgress(10);
      validateSize(file);

      const ffmpeg = await getFFmpeg();
      const inputName = `input.${file.name.split(".").pop() || "mp4"}`;
      const outputName = `${safeFileName(file.name)}-compressed.${format}`;
      await writeInputFile(ffmpeg, inputName, file);
      state.setProgress(35);

      const qualityMap: Record<string, string> = { high: "23", medium: "28", low: "32" };
      const crf = qualityMap[preset] || "28";
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",
        format === "webm" ? "libvpx" : "libx264",
        "-crf",
        crf,
        "-preset",
        "veryfast",
        "-c:a",
        format === "webm" ? "libvorbis" : "aac",
        outputName,
      ]);

      state.setProgress(85);
      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const blob = ffmpegDataToBlob(data, format === "webm" ? "video/webm" : "video/mp4");
      state.setOutput({ blob, name: outputName, type: blob.type });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to compress this file.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="video/mp4,video/webm" onFiles={(files) => setFile(files[0] || null)} helperText="MP4 or WebM · up to 300MB" />
      {file ? <p className="text-sm text-zinc-700">Selected: {file.name}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Quality preset
          <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="high">High quality</option>
            <option value="medium">Balanced</option>
            <option value="low">Smaller file</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Output format
          <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="mp4">MP4</option>
            <option value="webm">WebM</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={run} disabled={!file || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Compressing..." : "Compress video"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

function VideoTrimmerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("10");
  const [format, setFormat] = useState("mp4");
  const state = useWorkerState();

  const run = async () => {
    if (!file) return;

    try {
      state.setError("");
      state.setOutput(null);
      state.setIsWorking(true);
      state.setProgress(10);
      validateSize(file);

      const startValue = Number(start);
      const endValue = Number(end);
      if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue <= startValue) {
        throw new Error("Please enter a valid time range where end > start.");
      }

      const ffmpeg = await getFFmpeg();
      const inputName = `input.${file.name.split(".").pop() || "mp4"}`;
      const outputName = `${safeFileName(file.name)}-trimmed.${format}`;
      await writeInputFile(ffmpeg, inputName, file);
      state.setProgress(35);

      await ffmpeg.exec([
        "-i",
        inputName,
        "-ss",
        String(startValue),
        "-to",
        String(endValue),
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",
        format === "webm" ? "libvpx" : "libx264",
        "-c:a",
        format === "webm" ? "libvorbis" : "aac",
        outputName,
      ]);

      state.setProgress(85);
      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const blob = ffmpegDataToBlob(data, format === "webm" ? "video/webm" : "video/mp4");
      state.setOutput({ blob, name: outputName, type: blob.type });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to trim this video.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="video/mp4,video/webm" onFiles={(files) => setFile(files[0] || null)} helperText="MP4 or WebM" />
      <VideoPreview file={file} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          Start (s)
          <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          End (s)
          <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Output format
          <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="mp4">MP4</option>
            <option value="webm">WebM</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={run} disabled={!file || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Trimming..." : "Trim video"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

function Mp3CutterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("15");
  const state = useWorkerState();

  const run = async () => {
    if (!file) return;

    try {
      state.setError("");
      state.setOutput(null);
      state.setIsWorking(true);
      state.setProgress(10);
      validateSize(file, FILE_LIMITS_MB.audio);

      const startValue = Number(start);
      const endValue = Number(end);
      if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || endValue <= startValue) {
        throw new Error("Please enter a valid time range where end > start.");
      }

      const ffmpeg = await getFFmpeg();
      const inputName = `input.${file.name.split(".").pop() || "mp3"}`;
      const outputName = `${safeFileName(file.name)}-clip.mp3`;
      await writeInputFile(ffmpeg, inputName, file);
      state.setProgress(35);

      await ffmpeg.exec([
        "-i",
        inputName,
        "-ss",
        String(startValue),
        "-to",
        String(endValue),
        "-acodec",
        "libmp3lame",
        outputName,
      ]);

      state.setProgress(85);
      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const blob = ffmpegDataToBlob(data, "audio/mpeg");
      state.setOutput({ blob, name: outputName, type: blob.type });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to cut this audio file.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="audio/*" onFiles={(files) => setFile(files[0] || null)} helperText="Select audio and export trimmed MP3" />
      <AudioPreview file={file} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Start (s)
          <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          End (s)
          <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <button type="button" onClick={run} disabled={!file || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Cutting..." : "Cut MP3"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

function AudioConverterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("mp3");
  const state = useWorkerState();

  const mimeTypeByFormat: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    aac: "audio/aac",
    ogg: "audio/ogg",
  };

  const run = async () => {
    if (!file) return;

    try {
      state.setError("");
      state.setOutput(null);
      state.setIsWorking(true);
      state.setProgress(10);
      validateSize(file, FILE_LIMITS_MB.audio);

      const ffmpeg = await getFFmpeg();
      const inputName = `input.${file.name.split(".").pop() || "mp3"}`;
      const outputName = `${safeFileName(file.name)}.${format}`;
      await writeInputFile(ffmpeg, inputName, file);
      state.setProgress(35);

      const codecByFormat: Record<string, string[]> = {
        mp3: ["-acodec", "libmp3lame"],
        wav: ["-acodec", "pcm_s16le"],
        aac: ["-acodec", "aac"],
        ogg: ["-acodec", "libvorbis"],
      };

      await ffmpeg.exec(["-i", inputName, ...codecByFormat[format], outputName]);

      state.setProgress(85);
      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const blob = ffmpegDataToBlob(data, mimeTypeByFormat[format]);
      state.setOutput({ blob, name: outputName, type: blob.type });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to convert this audio file.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="audio/*" onFiles={(files) => setFile(files[0] || null)} helperText="Convert between MP3, WAV, AAC, OGG" />
      <AudioPreview file={file} />
      <label className="block space-y-1 text-sm">
        Target format
        <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="mp3">MP3</option>
          <option value="wav">WAV</option>
          <option value="aac">AAC</option>
          <option value="ogg">OGG</option>
        </select>
      </label>
      <button type="button" onClick={run} disabled={!file || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Converting..." : "Convert audio"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => reject(new Error("Unsupported image file."));
    image.src = url;
  });
}

function ImageCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("same");
  const [quality, setQuality] = useState(80);
  const state = useWorkerState();

  const run = async () => {
    if (!file) return;

    try {
      state.setError("");
      state.setOutput(null);
      state.setProgress(10);
      state.setIsWorking(true);
      validateSize(file, FILE_LIMITS_MB.image);

      const image = await loadImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to process image in this browser.");

      context.drawImage(image, 0, 0);
      state.setProgress(65);

      const targetMime =
        format === "same" ? file.type : format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, targetMime, Math.max(0.05, Math.min(quality / 100, 1)))
      );
      if (!blob) throw new Error("Compression failed. Try a different format or quality.");

      const extension = targetMime.split("/")[1] === "jpeg" ? "jpg" : targetMime.split("/")[1];
      state.setOutput({ blob, name: `${safeFileName(file.name)}-compressed.${extension}`, type: targetMime });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to compress image.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/jpeg,image/png,image/webp" onFiles={(files) => setFile(files[0] || null)} helperText="JPG, PNG, or WebP" />
      <ImagePreview file={file} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Output format
          <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="same">Same as input</option>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Quality: {quality}%
          <input type="range" min={5} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
        </label>
      </div>
      <button type="button" onClick={run} disabled={!file || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Compressing..." : "Compress image"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState("1280");
  const [height, setHeight] = useState("720");
  const [keepAspect, setKeepAspect] = useState(true);
  const [format, setFormat] = useState("same");
  const state = useWorkerState();

  const run = async () => {
    if (!file) return;

    try {
      state.setError("");
      state.setOutput(null);
      state.setProgress(10);
      state.setIsWorking(true);
      validateSize(file, FILE_LIMITS_MB.image);

      const image = await loadImage(file);
      const targetWidth = Number(width);
      let targetHeight = Number(height);
      if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight) || targetWidth < 1 || targetHeight < 1) {
        throw new Error("Width and height must be valid positive numbers.");
      }

      if (keepAspect) {
        const ratio = image.width / image.height;
        targetHeight = Math.round(targetWidth / ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to process image in this browser.");

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      state.setProgress(70);

      const targetMime =
        format === "same" ? file.type : format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, targetMime, 0.92));
      if (!blob) throw new Error("Resize failed for this file.");

      const extension = targetMime.split("/")[1] === "jpeg" ? "jpg" : targetMime.split("/")[1];
      state.setOutput({ blob, name: `${safeFileName(file.name)}-${targetWidth}x${targetHeight}.${extension}`, type: targetMime });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to resize image.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/jpeg,image/png,image/webp" onFiles={(files) => setFile(files[0] || null)} helperText="Resize with optional aspect lock" />
      <ImagePreview file={file} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Width (px)
          <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={width} onChange={(e) => setWidth(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          Height (px)
          <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={height} onChange={(e) => setHeight(e.target.value)} disabled={keepAspect} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} /> Keep aspect ratio
        </label>
        <label className="space-y-1 text-sm">
          Output format
          <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="same">Same as input</option>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={run} disabled={!file || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Resizing..." : "Resize image"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

function GifMakerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [fps, setFps] = useState("3");
  const state = useWorkerState();

  const run = async () => {
    if (files.length < 2) {
      state.setError("Please select at least 2 images to build a GIF.");
      return;
    }

    try {
      state.setError("");
      state.setOutput(null);
      state.setProgress(10);
      state.setIsWorking(true);
      files.forEach((file) => validateSize(file, FILE_LIMITS_MB.gifFrame));

      const ffmpeg = await getFFmpeg();
      state.setProgress(25);

      for (let i = 0; i < files.length; i += 1) {
        const frameName = `frame${String(i).padStart(3, "0")}.png`;
        await writeInputFile(ffmpeg, frameName, files[i]);
      }

      const outputName = `animated-${files.length}-frames.gif`;
      await ffmpeg.exec([
        "-framerate",
        String(Math.max(1, Number(fps) || 3)),
        "-i",
        "frame%03d.png",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        outputName,
      ]);

      state.setProgress(85);
      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const blob = ffmpegDataToBlob(data, "image/gif");
      state.setOutput({ blob, name: outputName, type: blob.type });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to create GIF from these images.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/jpeg,image/png,image/webp" multiple onFiles={(selected) => setFiles(selected)} helperText="Select multiple images in playback order" />
      {files.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-zinc-700">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`}>{file.name}</li>
          ))}
        </ul>
      ) : null}
      <label className="block space-y-1 text-sm">
        Frames per second
        <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={fps} onChange={(e) => setFps(e.target.value)} />
      </label>
      <button type="button" onClick={run} disabled={files.length < 2 || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Building GIF..." : "Create GIF"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

function PdfMergeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const state = useWorkerState();

  const run = async () => {
    if (files.length < 2) {
      state.setError("Please select at least 2 PDFs to merge.");
      return;
    }

    try {
      state.setError("");
      state.setOutput(null);
      state.setProgress(10);
      state.setIsWorking(true);
      files.forEach((file) => validateSize(file, FILE_LIMITS_MB.pdf));

      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i += 1) {
        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((page) => merged.addPage(page));
        state.setProgress(Math.min(85, 15 + Math.round(((i + 1) / files.length) * 70)));
      }

      const outputBytes = await merged.save();
      const blob = new Blob([Uint8Array.from(outputBytes)], { type: "application/pdf" });
      state.setOutput({ blob, name: `merged-${files.length}-files.pdf`, type: blob.type });
      state.setProgress(100);
    } catch (error) {
      state.setError(error instanceof Error ? error.message : "Unable to merge selected PDFs.");
    } finally {
      state.setIsWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone accept="application/pdf" multiple onFiles={(selected) => setFiles(selected)} helperText="Drop PDFs in merge order" />
      {files.length > 0 ? (
        <ol className="list-inside list-decimal text-sm text-zinc-700">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`}>{file.name}</li>
          ))}
        </ol>
      ) : null}
      <button type="button" onClick={run} disabled={files.length < 2 || state.isWorking} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {state.isWorking ? "Merging..." : "Merge PDFs"}
      </button>
      <Progress progress={state.progress} />
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <OutputPanel output={state.output} />
    </div>
  );
}

function QrCodeGeneratorTool() {
  const [value, setValue] = useState("https://zip.dev");
  const [size, setSize] = useState("280");
  const [pngData, setPngData] = useState("");
  const [svgData, setSvgData] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    try {
      setError("");
      if (!value.trim()) throw new Error("Please enter text or a URL first.");
      const outputSize = Number(size);
      if (!Number.isFinite(outputSize) || outputSize < 64 || outputSize > 1024) {
        throw new Error("Size must be between 64 and 1024 pixels.");
      }

      const [png, svg] = await Promise.all([
        QRCode.toDataURL(value, { width: outputSize, margin: 2 }),
        QRCode.toString(value, { type: "svg", width: outputSize, margin: 2 }),
      ]);
      setPngData(png);
      setSvgData(svg);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to generate QR code.");
    }
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-1 text-sm">
        Text or URL
        <textarea className="h-24 w-full rounded-lg border border-zinc-300 px-3 py-2" value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        Size (px)
        <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={size} onChange={(e) => setSize(e.target.value)} />
      </label>
      <button type="button" onClick={run} className="rounded-lg bg-blue-700 px-4 py-2 text-white">
        Generate QR code
      </button>
      {error ? <ErrorMessage message={error} /> : null}
      {pngData ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pngData} alt="Generated QR" className="max-h-60 rounded-lg" />
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={pngData} download="qr-code.png" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              Download PNG
            </a>
            <a
              href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`}
              download="qr-code.svg"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium"
            >
              Download SVG
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ZipTools() {
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractEntries, setExtractEntries] = useState<Array<{ name: string; blob: Blob }>>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const createZip = async () => {
    if (createFiles.length === 0) {
      setError("Select at least one file to create a ZIP.");
      return;
    }

    try {
      setError("");
      setWorking(true);
      const zip = new JSZip();
      createFiles.forEach((file) => zip.file(file.name, file));
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "archive.zip");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create ZIP.");
    } finally {
      setWorking(false);
    }
  };

  const extractZip = async () => {
    if (!extractFile) {
      setError("Please select a ZIP file to extract.");
      return;
    }

    try {
      setError("");
      setWorking(true);
      validateSize(extractFile, FILE_LIMITS_MB.zip);
      const zip = await JSZip.loadAsync(await extractFile.arrayBuffer());
      const entries: Array<{ name: string; blob: Blob }> = [];

      for (const [name, value] of Object.entries(zip.files)) {
        if (value.dir) continue;
        const blob = await value.async("blob");
        entries.push({ name, blob });
      }

      setExtractEntries(entries);
      if (entries.length === 0) {
        setError("No extractable files were found in this ZIP.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to extract ZIP.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Create ZIP</h3>
        <div className="mt-3">
          <FileDropzone multiple onFiles={(files) => setCreateFiles(files)} helperText="Select files to bundle into one ZIP" />
        </div>
        {createFiles.length > 0 ? <p className="mt-2 text-xs text-zinc-600">{createFiles.length} file(s) selected</p> : null}
        <button type="button" onClick={createZip} disabled={working} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
          Create ZIP
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Extract ZIP</h3>
        <div className="mt-3">
          <FileDropzone accept=".zip,application/zip" onFiles={(files) => setExtractFile(files[0] || null)} helperText="Upload a ZIP archive" />
        </div>
        <button type="button" onClick={extractZip} disabled={working} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
          Extract ZIP
        </button>

        {extractEntries.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {extractEntries.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <span className="truncate pr-3">{entry.name}</span>
                <button type="button" onClick={() => downloadBlob(entry.blob, entry.name)} className="rounded bg-zinc-900 px-3 py-1 text-xs text-white">
                  Download
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <ErrorMessage message={error} /> : null}
    </div>
  );
}

function MissingTool({ slug }: { slug: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-zinc-700">The tool “{slug}” is not available.</p>
      <Link href="/" className="text-blue-600 hover:text-blue-700">
        Go back home
      </Link>
    </div>
  );
}

export function ToolClientPage({ slug }: { slug: string }) {
  const tool = TOOL_BY_SLUG[slug as keyof typeof TOOL_BY_SLUG];

  const content = useMemo(() => {
    switch (slug) {
      case "video-compressor":
        return <VideoCompressorTool />;
      case "video-trimmer":
        return <VideoTrimmerTool />;
      case "mp3-cutter":
        return <Mp3CutterTool />;
      case "audio-converter":
        return <AudioConverterTool />;
      case "image-compressor":
        return <ImageCompressorTool />;
      case "image-resizer":
        return <ImageResizerTool />;
      case "gif-maker":
        return <GifMakerTool />;
      case "pdf-merge":
        return <PdfMergeTool />;
      case "qr-code-generator":
        return <QrCodeGeneratorTool />;
      case "zip-tools":
        return <ZipTools />;
      default:
        return <MissingTool slug={slug} />;
    }
  }, [slug]);

  if (!tool) return <MissingTool slug={slug} />;

  return <ToolShell title={tool.title} description={tool.description}>{content}</ToolShell>;
}
