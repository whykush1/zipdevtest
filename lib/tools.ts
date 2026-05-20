export type ToolCategory = "Video" | "Audio" | "Images" | "PDF" | "Utilities";

export type ToolDefinition = {
  slug: string;
  title: string;
  description: string;
  category: ToolCategory;
  accepts: string[];
};

export const TOOLS: ToolDefinition[] = [
  {
    slug: "video-compressor",
    title: "Video Compressor",
    description: "Reduce video file size with practical quality presets.",
    category: "Video",
    accepts: ["video/mp4", "video/webm"],
  },
  {
    slug: "video-trimmer",
    title: "Video Trimmer",
    description: "Cut your video by selecting custom start and end times.",
    category: "Video",
    accepts: ["video/mp4", "video/webm"],
  },
  {
    slug: "mp3-cutter",
    title: "MP3 Cutter",
    description: "Trim audio and export a ready-to-share MP3 clip.",
    category: "Audio",
    accepts: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4"],
  },
  {
    slug: "audio-converter",
    title: "Audio Converter",
    description: "Convert audio between MP3, WAV, AAC, and OGG formats.",
    category: "Audio",
    accepts: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4"],
  },
  {
    slug: "image-compressor",
    title: "Image Compressor",
    description: "Compress JPG, PNG, or WebP images with quality controls.",
    category: "Images",
    accepts: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    slug: "image-resizer",
    title: "Image Resizer",
    description: "Resize images quickly while preserving aspect ratio if needed.",
    category: "Images",
    accepts: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    slug: "gif-maker",
    title: "GIF Maker",
    description: "Turn a batch of images into an animated GIF in your browser.",
    category: "Images",
    accepts: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    slug: "pdf-merge",
    title: "PDF Merge",
    description: "Combine multiple PDF documents into a single file.",
    category: "PDF",
    accepts: ["application/pdf"],
  },
  {
    slug: "qr-code-generator",
    title: "QR Code Generator",
    description: "Generate QR codes from text or URLs and export instantly.",
    category: "Utilities",
    accepts: [],
  },
  {
    slug: "zip-tools",
    title: "ZIP Extract / Create",
    description: "Create ZIP files or extract ZIP archives directly in-browser.",
    category: "Utilities",
    accepts: ["application/zip", ".zip"],
  },
];

export const TOOL_BY_SLUG = Object.fromEntries(TOOLS.map((tool) => [tool.slug, tool]));
export const CATEGORIES: ToolCategory[] = ["Video", "Audio", "Images", "PDF", "Utilities"];
