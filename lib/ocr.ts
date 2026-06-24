import * as ImagePicker from "expo-image-picker";

import type { Speaker, Turn } from "./types";

// HARD REQUIREMENT (see BUILD_BRIEF.md §9): OCR runs ON DEVICE with Apple Vision.
// Raw screenshots must never leave the phone — only confirmed text is sent to huru.
//
// Apple Vision requires a native module (a dev client / config plugin), so it is
// NOT available in Expo Go. Until that module is added, the app uses the manual
// paste path (fully functional). Wire a real module here:
//   TODO: integrate `expo-text-extractor` or a custom VNRecognizeTextRequest module,
//   implement extractFromImages(uris) -> string[], then set OCR_AVAILABLE = true.

export const OCR_AVAILABLE = false;

export async function pickScreenshots(): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: 6,
    quality: 1,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}

// Placeholder until the native Vision module is wired.
export async function extractFromImages(_uris: string[]): Promise<string[]> {
  if (!OCR_AVAILABLE) {
    throw new Error("ocr_not_available");
  }
  return [];
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
