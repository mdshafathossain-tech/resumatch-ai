"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn, formatBytes, MAX_FILE_BYTES } from "@/lib/utils";

interface FileDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

function validate(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files are supported.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) {
    return `File is too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  return null;
}

export default function FileDropzone({ file, onChange, disabled = false }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validate(candidate);
    setError(problem);
    if (!problem) onChange(candidate);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    accept(event.target.files?.[0]);
    event.target.value = ""; // allow selecting the same file again
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const removeFile = () => {
    setError(null);
    onChange(null);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={handleInput}
        tabIndex={-1}
        aria-hidden
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-brand-mint/60 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-teal shadow-sm">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)} &middot; PDF</p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            disabled={disabled}
            aria-label="Remove selected file"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-red-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-label="Upload resume PDF. Click or drag and drop a file."
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
            dragging
              ? "border-brand-teal bg-brand-mint"
              : "border-slate-300 bg-white hover:border-brand-teal hover:bg-slate-50",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <span
            className={cn(
              "pointer-events-none mb-3 flex h-12 w-12 items-center justify-center rounded-full transition",
              dragging ? "bg-brand-teal text-white" : "bg-brand-mint text-brand-teal",
            )}
          >
            <UploadCloud className="h-6 w-6" aria-hidden />
          </span>
          <p className="pointer-events-none text-sm font-semibold text-slate-800">
            {dragging ? "Drop your PDF here" : "Drag & drop your resume, or click to browse"}
          </p>
          <p className="pointer-events-none mt-1 text-xs text-slate-500">
            PDF only &middot; up to {formatBytes(MAX_FILE_BYTES)} &middot; text-based (not scanned)
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
