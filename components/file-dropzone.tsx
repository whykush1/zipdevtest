"use client";

import { useRef, useState } from "react";

type Props = {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  helperText?: string;
};

export function FileDropzone({ accept, multiple, onFiles, helperText }: Props) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
        isOver ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-white"
      }`}
    >
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-sm text-zinc-600">Drop files here or</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Choose files
      </button>
      {helperText ? <p className="mt-2 text-xs text-zinc-500">{helperText}</p> : null}
    </div>
  );
}
