# Wing — the flirty wingman (Buddy AI, feature 1)

A polished iOS-first Expo / React Native app: screenshot a conversation → get 2–3 genuinely good, non-cringe flirty replies, plus a shareable result card. First wedge of **Buddy AI**. Backend = the **huru** 0G relay (`/Users/cyber/vster/huru`).

> Full product spec, API contract, compliance and growth plan: **`BUILD_BRIEF.md`** (next to this file).

## Run it

```bash
npm install
npx expo install --fix      # aligns native dep versions to the installed Expo SDK
npx expo start              # press i for iOS simulator, or scan the QR in Expo Go
```

It runs **fully offline on a mock backend** out of the box (no huru host needed) — see "Mock mode" below. The capture flow uses **pasted text** today; on-device screenshot OCR (Apple Vision) is stubbed pending a native module (see `lib/ocr.ts`).

## Mock mode

`lib/api.ts` returns local mock replies when `EXPO_PUBLIC_HURU_BASE` is empty or `EXPO_PUBLIC_MOCK=1`. To point at a real huru relay:

```bash
cp .env.example .env
# set EXPO_PUBLIC_HURU_BASE + EXPO_PUBLIC_HURU_KEY, set EXPO_PUBLIC_MOCK=0
```

The relay must expose the rizz endpoints from `BUILD_BRIEF.md` §6 (`/v1/consumers/device`, `/v1/rizz/reply`, `/v1/rizz/decode`, `/v1/rizz/opener`).

## Structure

```
app/                      expo-router screens
  _layout.tsx             root stack · boot · app-lock gate
  index.tsx               Home / Capture (paste or pick screenshots)
  onboarding.tsx          3-card no-signup onboarding + persona pick
  transcript.tsx          editable ME/THEM transcript (OCR safety net)
  reveal.tsx              vibe/spice controls · reply cards · paywall-the-reveal
  decode.tsx              "what do they mean?" read
  openers.tsx             openers from a bio
  paywall.tsx             weekly/annual (mock IAP flips entitlement)
  settings.tsx            app-lock · delete sessions · start fresh
components/               Button, ReplyCard, DecodeCard, TranscriptBubble,
                          VibePicker, SpiceSlider, Skeleton, AppLock
lib/
  api.ts                  huru client + offline mock
  auth.ts                 per-device anonymous identity (SecureStore)
  ocr.ts                  on-device OCR wrapper (paste path live; Vision = TODO)
  store.ts                in-flight session (capture→transcript→reveal)
  entitlement.ts          subscription gate (mock; wire to IAP)
  theme.ts / motion.tsx   design tokens + press/haptic primitives
  lock.ts / flags.ts / format.ts / types.ts
```

## What's stubbed (and where to finish it)

- **On-device OCR** → `lib/ocr.ts` (`OCR_AVAILABLE = false`). Wire Apple Vision; raw images must never leave the device.
- **IAP** → `app/paywall.tsx` + `lib/entitlement.ts`. Replace the local flip with StoreKit/RevenueCat → `POST /v1/consumers/{id}/iap`.
- **Share card** → `app/reveal.tsx` `share()` shares text; build the branded, auto-anonymized view-shot card (the growth engine).
- **Trust copy rule:** the API returns `verified: false` / `privacy: "enclave"`; the UI says "sealed enclave," **never "verified,"** until huru implements real per-call TEE attestation (`runtime.ts:buildVerification`).

## Compliance reminders (see BUILD_BRIEF §13)
SFW only (1.1.4) · UGC consent + report path + 17+ (1.2) · honest privacy label · subscription disclosure (3.1.2).
