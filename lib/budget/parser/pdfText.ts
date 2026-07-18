import { extractText, getDocumentProxy } from 'unpdf';

export interface ExtractedPdfText {
  totalPages: number;
  /** Raw text of each page, in order. Index 0 is page 1. */
  pages: string[];
}

/** Node-native PDF text extraction (pdf.js under the hood) -- no poppler/pdftotext binary required. */
export async function extractPdfText(data: Uint8Array | ArrayBuffer): Promise<ExtractedPdfText> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { totalPages, pages: text };
}
