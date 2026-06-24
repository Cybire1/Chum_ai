# Buddy AI — Build Brief

**Document purpose:** A self-contained spec for an AI/engineer to build the **first app**. Everything needed to start is here. Where the backend isn't ready, build the app against the documented API contract and mock it.

**Status:** v1 scope locked. Backend (`huru`) exists; the rizz endpoints are a small addition to it (see §6/§7). The mobile app is a new build.

---

## 0. TL;DR — what to build

A polished **iOS-first (Expo / React Native) "flirty wingman" app**, codename **Wing**, that is the first feature of a larger assistant ("Buddy AI"). The user screenshots a dating-app/iMessage conversation; the app reads it **on-device**, and returns **2–3 genuinely good, non-cringe flirty replies** plus a shareable result card. The entire moat is **reply quality**. The trust wedge is **privacy** (chats processed in a sealed enclave; nothing stored). Growth comes from a **shareable, anonymized reply/"decode" card** posted to TikTok.

Build order: **prove reply quality first**, then the capture→reveal→share loop, then monetization. Do **not** gold-plate; ship the loop.

---

## 1. Product context

- **Buddy AI** = a do-everything personal assistant (planning, gym, health, etc.). It is deliberately launched **one wedge at a time**. The first wedge is **rizz** (flirty replies) because it's a *proven-viral* category (RizzGPT ≈ 7.5M downloads) with a clear quality gap to exploit.
- The same backend (`huru`, a 0G AI gateway) already supports chat, speech-to-text, image generation, and encrypted storage — so later Buddy features (workout planner, voice journaling, etc.) reuse the same infra. **For v1, build only the rizz app.**

---

## 2. v1 scope

**In scope (ship these):**
1. No-signup onboarding (3 cards) + auto-provisioned anonymous account.
2. **Capture:** multi-screenshot picker + paste + one-line "describe it" note.
3. **On-device OCR** → an **editable ME/THEM transcript**.
4. **Replies mode:** vibe presets + SFW spice slider → 2–3 ranked reply cards (copy / regenerate-one / bolder-softer / share).
5. **Decode mode:** "what they actually mean" verdict card (free; the viral engine).
6. **Openers-from-bio:** bio screenshot → 3 openers anchored to a real detail.
7. **Share-card composer** with one-tap auto-anonymization + watermark + deep link.
8. **Paywall-the-reveal** + iOS IAP (weekly + annual).
9. Biometric app-lock, local-only history, "delete all local sessions," an enclave trust chip.

**Out of scope for v1 (do NOT build yet):** rehearsal/roleplay mode, separate escalation mode, full voice-cloning of the user, the rest of Buddy (gym/health/planning), Android, the live cryptographic "Verify" button, any web app.

---

## 3. Positioning & naming

- **Positioning:** "Rizz that doesn't sound like an app — the one reply that actually lands, in your voice, on chats no one can read."
- **The differentiator is REPLY QUALITY.** Every competitor is reviewed as corny/generic/repetitive. Beating that is the entire product. Privacy and fair pricing are supporting wedges.
- **Name:** working title **Wing**. App Store title e.g. `Wing: AI Rizz & Replies` ("rizz" lives in the keyword/subtitle field for search; the brand stays clean). Alternates: **Smooth**, **Comeback**. Confirm with founder before store submission.

---

## 4. Tech stack

- **Expo / React Native** (managed workflow), **expo-router** (file-based routing), TypeScript strict.
- **react-native-reanimated** + **react-native-svg** for motion and the result/share cards.
- **expo-secure-store** (Keychain) for the auth token + device id; **expo-local-authentication** (Face ID) for app-lock.
- **On-device OCR:** Apple Vision (`VNRecognizeTextRequest`) via a small native module / Expo config plugin (e.g. `expo-text-extractor` or `vision-camera` + text plugin, or a tiny custom module). **Raw images must never leave the device.**
- **IAP:** `expo-in-app-purchases` or RevenueCat (RevenueCat strongly recommended for receipt validation + entitlements).
- **Networking:** plain `fetch` to the huru relay.
- Reference implementation to mirror for app structure, design tokens, and motion: the founder's existing Expo app **"The Bell"** at `/Users/cyber/suioverflow/mobile` (per-device wallet pattern, `lib/theme.ts`, `lib/motion.tsx`, result-card components, biometric lock). Reuse those patterns.

> **Note:** `huru` is Next.js 16 with breaking changes from older versions — if you touch the backend, read `node_modules/next/dist/docs/` in that repo first.

---

## 5. Architecture

```
┌─────────────────────────────┐
│  Wing app (Expo / iOS)      │
│  • capture screenshots      │
│  • Apple Vision OCR (LOCAL) │  ── raw images NEVER leave device
│  • editable transcript      │
│  • vibe/spice controls      │
│  • result + share cards     │
│  • Face ID lock, IAP        │
└──────────────┬──────────────┘
               │  HTTPS  (cleaned text + context only)
               │  Authorization: Bearer ct_…   X-Huru-Api-Key: sk_…
               ▼
┌─────────────────────────────┐
│  huru relay (Next.js 16)    │   /Users/cyber/vster/huru
│  • auth + per-user credits  │
│  • RIZZ PIPELINE (server):  │
│    grounding→writer→judge→  │
│    select  (multiple calls) │
│  • request logging          │
└──────────────┬──────────────┘
               │  @0glabs/0g-serving-broker  (TEE-preferred)
               ▼
┌─────────────────────────────┐
│  0G Compute (mainnet, TEE)  │  deepseek-chat-v3 default; GLM-5 step-up
└─────────────────────────────┘
```

**Key principle:** the reply-quality pipeline runs **server-side in huru**, not on the device. The app sends cleaned text + controls and renders the returned replies. This keeps prompts/models server-controlled and lets the pipeline make several model calls per reveal.

---

## 6. Backend API contract (build the app against this)

Base URL: `https://<huru-host>` (local dev `http://localhost:3000`). All rizz endpoints are **to be added** to huru (see §7) but the contract below is fixed — the app can mock it until the backend ships.

### 6.1 Auth model
Two headers on every call:
- `X-Huru-Api-Key: sk_…` — the project key (ship the **publishable** project key in the app; it only identifies the project, not the user).
- `Authorization: Bearer ct_…` — the per-user **consumer token** (JWT, 24h). Refresh when expired.

**Device-anonymous provisioning (NEW endpoint — no signup):**
```
POST /v1/consumers/device
Headers: X-Huru-Api-Key: sk_…
Body:    { "device_id": "<uuid generated & stored on device>" }
200:     { "consumer_id": "con_…", "token": "ct_…", "credits_balance": 200, "expires_at": "…" }
```
The app generates a random `device_id` on first launch, stores it in Keychain, calls this once, and caches `consumer_id` + `token`. Re-call to refresh the token (idempotent on `device_id`).

### 6.2 Replies — the core endpoint
```
POST /v1/rizz/reply
Headers: Authorization: Bearer ct_…   X-Huru-Api-Key: sk_…   Idempotency-Key: <uuid>
Body:
{
  "conversation": [
    { "speaker": "them", "text": "haha you actually climb? prove it" },
    { "speaker": "me",   "text": "i mean my gym shoes have seen things" }
  ],
  "context_note": "matched on Hinge, her bio says she loves bouldering",  // optional
  "vibe": "playful",                 // playful | smooth | bold | funny | sweet
  "spice": 2,                        // 1..3, SFW-capped
  "goal": "reply",                   // reply | opener | revive | ask_out  (optional)
  "platform": "hinge",               // optional, for tone
  "persona": "dry"                   // dry | goofy | smooth | nerdy | null  (user's voice)
}
200:
{
  "replies": [
    { "id": "r1", "text": "send me your hardest send and i'll judge your technique over coffee",
      "angle": "tease", "device": "callback" },
    { "id": "r2", "text": "proof requires a belay partner. i'm just saying.",
      "angle": "smooth", "device": "misdirection" },
    { "id": "r3", "text": "i peak at the 'looking strong' wall but i'm an excellent cheerleader",
      "angle": "self_aware", "device": "self_deprecation" }
  ],
  "huru": { "request_id": "req_…", "credits_used": 9, "verified": false, "privacy": "enclave" }
}
402: { "error": "insufficient_credits", "balance": 0, "checkout_url": "…" }   // free-tier exhausted
429: rate-limited (respect X-RateLimit-* + Retry-After)
```
- Always returns **2–3** replies, each a different `angle`+`device` (anti-repetition).
- `regenerate one reply`: re-POST with the same body plus `"exclude_ids": ["r1"]` and `"regenerate": true` → returns one fresh reply using a different device.

### 6.3 Decode — the free viral engine
```
POST /v1/rizz/decode
Body: { "conversation": [...], "context_note": "…" }
200:
{
  "verdict": "testing",                         // interested | testing | polite | losing_interest
  "confidence": 72,                             // 0..100
  "evidence": ["'prove it' is a challenge, not disinterest", "she double-texted first"],
  "suggested_move": "match the challenge energy, then pivot to a low-stakes plan",
  "huru": { "request_id": "req_…", "credits_used": 2, "verified": false, "privacy": "enclave" }
}
```
Decode is **kept free / generous** (it's the share engine). Never paywall Decode.

### 6.4 Openers from bio
```
POST /v1/rizz/opener
Body: { "bio_text": "bouldering • oat milk • will steal your hoodie", "vibe": "playful", "persona": "dry" }
200: { "openers": [ {"id":"o1","text":"…","anchor":"bouldering"}, … 3 … ], "huru": {…} }
```

### 6.5 Balance & entitlement
```
GET /v1/auth/me        →  { "consumer_id","email"|null,"credits_balance": 184, "subscription": {"active":false,"plan":null} }
```

### 6.6 IAP → entitlement (NEW endpoint)
The app does the StoreKit purchase, then:
```
POST /v1/consumers/{consumer_id}/iap
Headers: Authorization: Bearer ct_…   X-Huru-Api-Key: sk_…
Body: { "platform":"apple", "receipt":"<base64 receipt or StoreKit2 JWS>", "product_id":"wing_weekly" }
200:  { "subscription": {"active":true,"plan":"weekly","expires_at":"…"}, "credits_balance": 184 }
```
huru validates the receipt with Apple and flips the consumer's subscription entitlement. **Recommended: use RevenueCat** and have huru trust a RevenueCat webhook instead of validating raw receipts itself.

**Entitlement model:** free users get a small daily allotment of **Replies** reveals (Decode stays free); an active subscription unlocks **unlimited** reveals (fair-use capped) + Bold spice + the user-voice persona. huru still meters credits internally for cost, but the consumer-facing gate is "subscription active."

---

## 7. The reply-quality pipeline (server-side, in huru)

> The app does not implement this, but must understand its behavior and latency (~2–5s/reveal). It lives in `huru` at `src/lib/huru/pipelines/rizz-reply.ts`, exposed by `src/app/v1/rizz/reply/route.ts` (clone `src/app/v1/chat/completions/route.ts`; pre-reserve ~10 credits, settle the sum). Model: `deepseek-chat-v3` default, `GLM-5` step-up — both TEE on 0G mainnet.

Four passes:
1. **Grounding** (silent): extract the single most teasable detail in their last message, their energy level, whether a callback exists, and any withdrawal signals.
2. **Writer** (over-generate 6–8): "you are the user's witty, confident friend texting on their behalf." Rules: use a specific detail or callback; calibrate **exactly one notch** bolder than their last message (dial *down* + add warmth if they're dry — never escalate a withdrawing thread); ≤1–2 lines; one idea + one hook; **rotate humor device + sentence shape** across candidates; casual register, 0–1 emoji. Contrastive good-vs-cringe few-shots.
3. **Judge** (cheap second call): score fit / specificity / wit / boldness-calibration / brevity / hook / non-cringe, plus two **hard gates** — SFW (protects App Store 1.1.4) and respect/consent (no demeaning, no off-limits teasing of looks/body/intelligence/family/trauma). Auto-reject any "as an AI"/meta text.
4. **Select:** drop gate failures; require specificity≥1 and fit≥1 or regenerate; enforce structural diversity; return top 2–3. **If nothing clears the bar, regenerate rather than ship mediocre.**

**Day-1 gate (do before building the app):** run the pipeline against a 50-example golden test set of real-feeling threads (dry, playful, cold-open, post-IRL, withdrawing) on `deepseek-v3` vs `GLM-5`; confirm outputs genuinely beat cringe on the rubric. If not, fix prompts before writing app code.

---

## 8. Screens & flows

Use a dark, premium aesthetic (see §10). Every interactive surface springs + light-haptics on press.

1. **Onboarding (3 cards, no signup, no card):**
   - Card 1 — *Promise:* "Never send a dry text again." One-line value.
   - Card 2 — *Privacy:* "Your chats are read in a sealed enclave and never stored — not even by us." (enclave chip).
   - Card 3 — *Persona pick:* Dry / Goofy / Smooth / Nerdy (sets the user's default voice). 
   - On finish: silently `POST /v1/consumers/device`, store token, land on Home.

2. **Home / Capture:**
   - Big primary: "Drop the convo." Multi-screenshot picker (camera-roll multi-select) + "Paste text" + a one-line "describe it" field (optional).
   - Secondary entries: **Decode** (free), **Openers** (paste a bio).

3. **Transcript review (the quality + privacy keystone):**
   - On-device OCR parses screenshots into **editable ME/THEM bubbles**; tap a bubble to flip speaker; their last message auto-highlighted. User can edit/delete. "Looks right →" continues.
   - Copy here reinforces privacy: "Read on your device. Only the text goes out, in a sealed enclave."

4. **Reveal (core paid loop):**
   - Top: live sentence of what you're answering. Controls: **Vibe** presets (Playful default, Smooth, Bold, Funny, Sweet) + **Spice** slider 1–3 (3 = bold-but-SFW).
   - A short, branded loading beat ("reading the vibe… running the cringe filter").
   - Returns **2–3 reply cards**, each tagged by angle. Per card: **Copy** (primary), **Regenerate this one**, **make it bolder/softer**, **Share as card**.
   - Free users: show ONE reply + a blurred stack of "sharper options" → paywall.

5. **Decode result card:** verdict (Interested / Testing / Polite / Losing interest) + confidence meter + 1–2 quoted evidence lines + suggested move + one-tap "draft that reply" (into Reveal). Prominent **Share** (this is the viral artifact).

6. **Openers:** bio screenshot/paste → 3 openers, each anchored to a real bio detail. Copy / Share.

7. **Share-card composer (growth engine — equal priority to the engine):**
   - One-tap **auto-anonymize**: blur faces/avatars, strip handles, swap names to neutral placeholders, crop platform chrome.
   - Adds wordmark + handle watermark + deep link. Two formats: the **reply card** and a **"rate my rizz" before/after** (your dry draft vs Wing's). Export to TikTok / IG / iMessage / save.

8. **Paywall:** appears at the reveal moment. Two options only — **Weekly $4.99** (3-day free trial) and **Annual $44.99** (pre-selected, "save ~80%" badge). One-tap cancel copy, restore purchases, auto-renew disclosure. Optional Lifetime $79.99.

9. **Settings:** Face ID app-lock toggle, "Delete all local sessions," persona, restore purchases, the **enclave Trust note** (plain-language), support email, "report a problem."

**State machine per reveal:** capture → OCR → review/edit → (vibe/spice) → reveal (loading → cards) → share/copy. Free-tier gate sits between review and full reveal.

---

## 9. On-device OCR (hard requirement)

- Use **Apple Vision** locally. Raw screenshots **must not** be uploaded anywhere. Only the parsed, user-confirmed text + context note are sent to huru.
- Build a small native module / Expo config-plugin wrapper around `VNRecognizeTextRequest`. Handle multi-image (stitch in order). Best-effort speaker attribution by bubble x-position/color, then let the user correct it in the transcript screen (the editable transcript is the safety net for OCR errors).
- Test against real screenshots from **Tinder, Hinge, Bumble, iMessage, Instagram, Snapchat** — each has different chat chrome.

---

## 10. Design system & visual direction

- **Dark, premium, confident** — not a cheesy "pickup" aesthetic. Near-black canvas, one warm accent (a coral/ember or vermilion), tabular-mono for any numbers, a clean editorial sans for display. Mirror the quality bar of the founder's "The Bell" app (`/Users/cyber/suioverflow/mobile/lib/theme.ts`, `lib/motion.tsx`, result-card components) — reuse those tokens/patterns where sensible, but Wing is its own brand (warmer than The Bell's cold finance vibe).
- **Result cards are the hero UI** — they must look premium enough that screenshots of them sell the app on a TikTok feed.
- Motion: spring presses + light haptics everywhere; a distinctive "reveal" animation; skeletons, not spinners.
- Accessibility: real `accessibilityLabel`/`Role` on every touch target (a known gap to avoid).

---

## 11. The viral share-card (this is the growth engine, not a nicety)

- Every reveal and every Decode ends with a one-tap **Share**.
- Cards are pre-rendered (SVG/canvas), **auto-anonymized**, watermarked (handle + wordmark + deep link).
- Two formats: reply card, and "rate my rizz" before/after. Make the card the star — it's relatable mini-content, not an ad.
- Attribution: each share carries a deep link; grant a free reveal credit for installs attributed to a user's share (referral fuel).

---

## 12. Monetization

- **Free-to-try, no card.** Decode = generous/free. Replies = 3–5 free reveals then 1–2/day (earn more via share/referral). Free users always SEE blurred locked options (FOMO).
- **Paywall the reveal** (the best option is behind it). Two-option paywall only; annual default.
- **Prices:** Weekly **$4.99** (3-day trial), Annual **$44.99** (anchor), optional Lifetime **$79.99**. Undercuts the category's $6.99–7.99/wk norm.
- **No dark patterns** — one-tap in-app cancel, no surprise add-ons, no post-cancel billing. This is an explicit product promise and a review-defense (the category sits at ~2.6★ over billing rage).
- Unit cost is fractions of a cent per reveal, so **CAC, not COGS, is the constraint** — optimize for trial-start + retention.

---

## 13. App Store compliance (do not skip)

- **1.1.4 (no explicit content):** SFW only — flirty/suggestive is fine, explicit is not. Enforce via the server-side SFW gate + a final output classifier. Icon/screenshots/marketing stay tasteful; market "wingman," never "sexting." Spice slider hard-caps below explicit.
- **1.2 (UGC of third parties — the real exposure):** users upload other people's private DMs. Required in v1: first-run **consent notice** ("only upload conversations you're part of; don't harass, dox, or impersonate"), an in-app **"report a problem"** path + support email + takedown process, ability to refuse/flag a generation, **store-nothing** architecture, **17+** age rating.
- **Privacy:** publish an honest privacy policy + App Privacy "nutrition label." On-device OCR + store-nothing means you can truthfully claim minimal data collection.
- **3.1.2 (subscriptions):** disclose auto-renew terms, provide restore purchases.

---

## 14. Privacy & 0G trust framing (honest copy rules)

- You MAY say: "processed in a **privacy-preserving sealed enclave**," "your chats are **not stored**," "read on your device." These are true (TEE providers + on-device OCR + store-nothing).
- You may **NOT** say "verified" / "cryptographically verified" / show a live "Verify" button **yet** — huru's `buildVerification()` currently hard-codes `verified:true` without checking the attestation quote. Over-claiming is an FTC + App Store risk. The live Verify feature is a **v1.1** item (after real per-call quote verification ships). Until then the API returns `"verified": false, "privacy": "enclave"` and the app shows a static "Sealed enclave" chip, not a verified badge.

---

## 15. Out of scope for v1
Rehearsal/roleplay mode • separate escalation mode • full user-voice cloning (ship persona PICK only) • the rest of Buddy AI (gym/health/planning) • Android • web • the live cryptographic Verify button • storing chat content server-side.

---

## 16. Milestones & acceptance criteria

- **M0 — Quality gate (backend, before app):** rizz pipeline in huru + 50-example golden set; replies on `deepseek-v3`/`GLM-5` beat cringe on the rubric. *AC: a blind reviewer prefers Wing's replies over a baseline single-shot prompt on ≥70% of the golden set.*
- **M1 — Endpoints live:** `/v1/consumers/device`, `/v1/rizz/reply`, `/v1/rizz/decode`, `/v1/rizz/opener`, `/v1/auth/me`, `/v1/consumers/{id}/iap`. *AC: all return the documented shapes; credits pre-reserve/settle correctly.*
- **M2 — App core loop:** capture → on-device OCR → editable transcript → reveal (2–3 cards) on a real device against the live API. *AC: screenshot to ranked replies in <6s; OCR + speaker-flip works on all six platforms.*
- **M3 — Growth artifact:** share-card composer with auto-anonymization + watermark + deep link; Decode card. *AC: a shared card has no faces/handles/real names and carries a working deep link.*
- **M4 — Monetize + comply:** IAP (weekly/annual), paywall-the-reveal, consent notice, report path, app-lock, 17+. *AC: trial→subscribe→entitlement flips; restore works; cancel is one tap.*
- **M5 — Polish + dogfood:** reveal motion, rating prompt at the post-reveal delight peak, dogfood on real DMs.

---

## 17. Open decisions (confirm with founder)
1. Final app name (Wing / Smooth / Comeback).
2. RevenueCat vs raw StoreKit receipt validation (recommend RevenueCat).
3. Exact free-tier daily reveal count.
4. Brand palette (reuse The Bell's tokens vs a new warmer identity).
5. huru host/domain + which project `sk_` publishable key the app ships with.

---

### Appendix A — Repos & references
- **Backend (huru):** `/Users/cyber/vster/huru` — Next.js 16 0G gateway. Reuse `src/lib/huru/{runtime,store,pricing,rate-limit}.ts`. Add `src/lib/huru/pipelines/rizz-reply.ts` + `src/app/v1/rizz/*`. Honesty note: `src/lib/huru/runtime.ts:162–178` (`buildVerification`).
- **App pattern reference:** `/Users/cyber/suioverflow/mobile` ("The Bell") — Expo design system, motion, result cards, per-device identity, biometric lock.
- **0G models on mainnet (TEE):** `deepseek-chat-v3` (default, cheap), `GLM-5` (quality step-up), `whisper-large-v3` (STT, later), `z-image` (images, later).
