// The rich-text decoder lives in shared/richDoc.js so the admin preview, the
// signing page and the PDFs all read documents the same way.
export { parseRichText, sanitizeToAllowedHtml, richTextToSafeHtml, blocksToHtml, decodeEntities, pdfSafe } from "../../shared/richDoc.js";
