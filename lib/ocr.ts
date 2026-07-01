import * as ImagePicker from "expo-image-picker";

import { visionAvailable, visionExtract, type VisionInputImage } from "./api";
import type { Speaker, Turn } from "./types";

// PRIVACY (see BUILD_BRIEF.md §9): screenshots carry sensitive conversations, so
// they must be handled with care. When a 0G vision model is configured the image
// bytes are read INSIDE the 0G sealed enclave (TEE) for transcription and are
// never stored — only the resulting ME/THEM text is used downstream. When vision
// is off, the picker is unavailable and the user falls back to the manual paste
// path (fully functional, nothing ever leaves the phone).

export type Shot = { uri: string; base64?: string; mimeType?: string };

// OCR is available only when a 0G vision model is configured (enclave transcription).
export const OCR_AVAILABLE = visionAvailable;

export async function pickScreenshots(): Promise<Shot[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: 6,
    quality: OCR_AVAILABLE ? 0.65 : 1,
    base64: OCR_AVAILABLE,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => ({
    uri: a.uri,
    base64: a.base64 ?? undefined,
    mimeType: a.mimeType ?? undefined,
  }));
}

// Transcribe screenshots into a ME/THEM transcript via the 0G vision enclave.
// Throws "ocr_not_available" if vision is off or no image bytes were captured.
export async function extractFromImages(shots: Shot[]): Promise<Turn[]> {
  if (!OCR_AVAILABLE) {
    throw new Error("ocr_not_available");
  }
  const images: VisionInputImage[] = [];
  for (const shot of shots) {
    if (typeof shot.base64 === "string" && shot.base64.length > 0) {
      images.push({ data: shot.base64, mime_type: shot.mimeType ?? "image/jpeg" });
    }
  }
  if (images.length === 0) {
    throw new Error("ocr_not_available");
  }
  const raw = await visionExtract(images);
  return parseConversation(raw);
}

// Heuristic parse of pasted/typed text into a ME/THEM transcript.
// Supports explicit "me:" / "them:" / "her:" / "him:" prefixes, otherwise
// alternates starting with THEM (the most common case: you paste what they sent).
export function parseConversation(raw: string): Turn[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const hasPrefixes = lines.some((l) =>
    /^(me|you|them|her|him|she|he)\s*[:\-]/i.test(l),
  );

  if (hasPrefixes) {
    return lines.map((l) => {
      const m = l.match(/^(me|you|them|her|him|she|he)\s*[:\-]\s*(.*)$/i);
      if (m) {
        const tag = m[1]!.toLowerCase();
        const speaker: Speaker = tag === "me" || tag === "you" ? "me" : "them";
        return { speaker, text: m[2] ?? "" };
      }
      return { speaker: "them" as Speaker, text: l };
    });
  }

  // No prefixes: alternate, starting with THEM.
  return lines.map((text, i) => ({
    speaker: (i % 2 === 0 ? "them" : "me") as Speaker,
    text,
  }));
}
