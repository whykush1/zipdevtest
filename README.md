# zip.dev (MVP)

A clean, client-side tools hub (original UI/copy) inspired by the idea of a multi-tool site.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Deploy (Vercel)

- Import the GitHub repo into Vercel
- Framework preset: Next.js
- Add your domain `zip.dev`

## Notes / limitations

- All processing runs **in the browser** (no backend). Large files may be slow and memory-heavy.
- Tools that use FFmpeg (wasm) are lazy-loaded per-tool to reduce initial load.

## Tools (MVP)

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
