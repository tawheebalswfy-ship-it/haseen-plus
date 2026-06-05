/**
 * Document text extraction utilities.
 * Uses pdfjs-dist for real PDF parsing, and built-in APIs for .docx/.txt.
 */

import * as pdfjsLib from "pdfjs-dist";
import { strFromU8, unzipSync } from "fflate";

// Use the CDN-hosted worker to avoid bundling the 1.3 MB worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ── PDF extraction via pdf.js ──────────────────────────────

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    if (pageText.trim()) pages.push(pageText.trim());
  }

  return pages.join("\n\n");
}

// ── DOCX extraction ────────────────────────────────────────

export async function extractTextFromDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf));
  } catch {
    throw new Error("DOCX text could not be extracted. Please upload TXT/PDF or paste the text.");
  }

  const documentXml = files["word/document.xml"];
  if (!documentXml) {
    throw new Error("DOCX text could not be extracted. Please upload TXT/PDF or paste the text.");
  }

  const bodyXml = strFromU8(documentXml);

  const parts: string[] = [];
  const tPattern = /<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = tPattern.exec(bodyXml)) !== null) {
    if (m[0] === "<w:tab/>") parts.push("\t");
    else if (m[0] === "<w:br/>" || m[0] === "</w:p>") parts.push("\n");
    else if (m[1]) {
      parts.push(
        m[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      );
    }
  }

  const text = parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!text) {
    throw new Error("DOCX text could not be extracted. Please upload TXT/PDF or paste the text.");
  }

  return text;
}

// ── Plain text extraction ──────────────────────────────────

export function extractTextFromPlain(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read text file"));
    reader.readAsText(file);
  });
}

// ── Auto-detect & extract ──────────────────────────────────

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }
  if (name.endsWith(".docx")) {
    return extractTextFromDocx(file);
  }
  // .txt, .csv, .md, and anything else → read as plain text
  return extractTextFromPlain(file);
}

// ── Split text into meaningful sections for batch classify ──

/**
 * Split extracted document text into sections suitable for the ML model.
 * Each section is at most `maxLen` characters.
 * Tries to split on paragraph boundaries first, then sentence boundaries.
 */
export function splitIntoSections(
  text: string,
  maxLen = 4500,
  minLen = 100,
): string[] {
  if (!text.trim()) return [];

  // Split on double-newlines (paragraphs)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 20);

  if (paragraphs.length === 0) {
    // Fallback: just chunk the raw text
    return chunkText(text, maxLen);
  }

  // Merge small paragraphs into chunks ≤ maxLen
  const sections: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxLen) {
      if (current.length >= minLen) sections.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.length >= minLen) sections.push(current);

  // Cap at 32 sections (API batch limit)
  return sections.slice(0, 32);
}

function chunkText(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    const chunk = text.slice(i, i + maxLen).trim();
    if (chunk.length >= 50) chunks.push(chunk);
  }
  return chunks.slice(0, 32);
}
