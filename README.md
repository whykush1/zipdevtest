# zip.dev tools hub (MVP)

Clean, original, client-side tools hub built with Next.js + TypeScript + Tailwind.

## Included tools

1. Video Compressor
2. Video Trimmer
3. MP3 Cutter
4. Audio Converter
5. Image Compressor
6. Image Resizer
7. GIF Maker
8. PDF Merge
9. QR Code Generator
10. ZIP Extract / Create ZIP

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- `@ffmpeg/ffmpeg` + `@ffmpeg/util` (lazy-loaded only on media tools)
- `pdf-lib` (PDF merge)
- `jszip` (zip create/extract)
- `qrcode` (QR generation)

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Lint and build

```bash
npm run lint
npm run build
npm start
```

## Deploy

Recommended: Vercel

1. Import this repo into Vercel
2. Framework preset: Next.js
3. Add custom domain `zip.dev` if desired

## Client-side limitations

- All processing is in-browser. No backend is required.
- Large media files can be slow and memory-intensive.
- Browser memory limits can stop very large FFmpeg jobs.
- Supported formats are limited to what browser APIs and ffmpeg.wasm can process.
- ZIP extraction provides individual file downloads from the archive.
