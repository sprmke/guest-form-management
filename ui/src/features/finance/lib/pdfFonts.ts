import type { jsPDF } from 'jspdf';
import { PDF_FONT } from '@/features/finance/lib/pdfTheme';

const FONT_PATHS = {
  regular: '/fonts/PlusJakartaSans-Regular.ttf',
  semi: '/fonts/PlusJakartaSans-SemiBold.ttf',
} as const;

let fontData: { regular: string; semi: string } | null = null;
let fontLoad: Promise<{ regular: string; semi: string }> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url}`);
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function loadFontFiles(): Promise<{ regular: string; semi: string }> {
  if (fontData) return fontData;
  if (!fontLoad) {
    fontLoad = Promise.all([
      fetchFontBase64(FONT_PATHS.regular),
      fetchFontBase64(FONT_PATHS.semi),
    ]).then(([regular, semi]) => {
      fontData = { regular, semi };
      return fontData;
    });
  }
  return fontLoad;
}

export async function registerPdfFonts(doc: jsPDF): Promise<void> {
  try {
    const { regular, semi } = await loadFontFiles();
    doc.addFileToVFS('PJS-Regular.ttf', regular);
    doc.addFileToVFS('PJS-SemiBold.ttf', semi);
    doc.addFont('PJS-Regular.ttf', PDF_FONT, 'normal');
    doc.addFont('PJS-SemiBold.ttf', PDF_FONT, 'bold');
  } catch {
    doc.setFont('helvetica', 'normal');
  }
}

export function setPdfFont(
  doc: jsPDF,
  style: 'normal' | 'bold',
  size: number,
): void {
  try {
    doc.setFont(PDF_FONT, style);
  } catch {
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
  }
  doc.setFontSize(size);
}
