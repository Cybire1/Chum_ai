import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Blob } from "../../components/Blob";
import { Button } from "../../components/Button";
import { describeApiError, getAgenticId, ownChum } from "../../lib/api";
import { seen } from "../../lib/flags";
import { FadeInDown, haptic, PressableScale, ThinkingDots } from "../../lib/motion";
import {
  extractFromImages,
  OCR_AVAILABLE,
  parseConversation,
  pickScreenshots,
  type Shot,
} from "../../lib/ocr";
import { getSession, resetSession, setSession } from "../../lib/store";
import { colors, radius, space, type } from "../../lib/theme";
import type { AgenticIdRecord } from "../../lib/types";

const SAMPLE = `them: haha you actually climb? prove it
me: my gym shoes have seen things`;

type Accent = { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string };

const QUICK: Accent[] = [
  { icon: "sparkles", label: "Decode", hint: "what do they mean?" },
  { icon: "color-wand", label: "Openers", hint: "from a bio" },
  { icon: "pulse", label: "Revive", hint: "a dead chat" },
];

// Romantic, happy-people imagery (loremflickr = tag-matched real photos, no API key).
// One fitting hero photo — Unsplash CDN (high-res, licensed, free for commercial,
// reliable). Every other card uses color, not photos.
const WINGMAN_HERO =
  "https://images.unsplash.com/photo-1541089404510-5c9a779841fc?w=1000&h=1500&fit=crop&q=80";

const LINES: { tag: string; text: string }[] = [
  { tag: "TEASE", text: "my gym shoes have seen things — pics are strictly need-to-know" },
  { tag: "CALLBACK", text: "you said you'd prove it. the climbing gym is right there" },
  { tag: "SMOOTH", text: "dangerously charming for someone I just started talking to" },
  { tag: "PLAYFUL", text: "okay you're funny. annoying. but funny." },
];

export default function Home() {
  const [checked, setChecked] = useState(false);
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgenticIdRecord | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMinting, setAgentMinting] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      if (!(await seen("onboarded"))) {
        router.replace("/onboarding");
        return;
      }
      setChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!checked) return;
    let alive = true;
    setAgentLoading(true);
    setAgentError(null);
    getAgenticId()
      .then((record) => {
        if (alive) setAgent(record);
      })
      .catch((error) => {
        if (alive) setAgentError(describeApiError(error, "Ownership is unavailable right now."));
      })
      .finally(() => {
        if (alive) setAgentLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [checked]);

  if (!checked) return <View style={styles.root} />;

  const openPaste = () => {
    setShowPaste(true);
    haptic("light");
  };

  const onPick = async () => {
    const picked = await pickScreenshots();
    if (!picked.length) return;
    setShots(picked);
    setErr(null);
    haptic("light");
    if (!OCR_AVAILABLE) {
      setNotice("On-device reading is coming — paste the chat for now and I've got you.");
      setShowPaste(true);
      haptic("warning");
    } else {
      setNotice(null);
      setShowPaste(false);
    }
  };

  const getReplies = async () => {
    if (!shots.length) return;
    if (!OCR_AVAILABLE) {
      setNotice("On-device reading is coming — paste the chat for now and I've got you.");
      setShowPaste(true);
      haptic("warning");
      return;
    }
    setProcessing(true);
    setNotice(null);
    try {
      const turns = await extractFromImages(shots);
      if (turns.length) {
        resetSession();
        setSession({ conversation: turns, contextNote: note.trim() });
        haptic("medium");
        router.push("/reveal");
      } else {
        setNotice("Couldn't read that one cleanly — paste the chat and I've got you.");
        setShowPaste(true);
        haptic("warning");
      }
    } catch (error) {
      setNotice(describeApiError(error, "Couldn't read that one cleanly — paste the chat and I've got you."));
      setShowPaste(true);
      haptic("warning");
    } finally {
      setProcessing(false);
    }
  };

  const goPaste = () => {
    const conversation = parseConversation(raw);
    if (conversation.length === 0) {
      if (shots.length > 0) {
        getReplies();
        return;
      }
      setErr("Type or paste the messages first — or tap “Try a sample”.");
      haptic("warning");
      return;
    }
    setErr(null);
    resetSession();
    setSession({ conversation, contextNote: note.trim() });
    haptic("medium");
    router.push("/reveal");
  };

  const onQuick = (label: string) => {
    if (label === "Decode") {
      const conversation = parseConversation(raw);
      if (conversation.length === 0) {
        setNotice("Paste the convo first, then I'll decode what they mean.");
        setShowPaste(true);
        haptic("warning");
        return;
      }
      resetSession();
      setSession({ conversation, contextNote: note.trim() });
      haptic("medium");
      router.push("/decode");
      return;
    }
    // Openers + Revive both start from a fresh line
    haptic("light");
    router.push("/openers");
  };

  const claimChum = async () => {
    if (agent?.status === "owned") {
      haptic("light");
      router.push("/own");
      return;
    }
    setAgentMinting(true);
    setAgentError(null);
    try {
      const persona = getSession().persona ?? "smooth";
      const next = await ownChum({ persona, displayName: "My Chum" });
      setAgent(next);
      haptic(next.status === "owned" ? "success" : "warning");
    } catch (error) {
      setAgentError(describeApiError(error, "Could not create your Chum ID yet."));
      haptic("warning");
    } finally {
      setAgentMinting(false);
    }
  };

  const picked = shots.length > 0;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HERO */}
            <PressableScale
              entering={FadeInDown.delay(40).springify().damping(15).stiffness(160)}
              onPress={picked ? undefined : onPick}
              hkind="light"
              to={picked ? 1 : 0.98}
              accessibilityRole="button"
              accessibilityLabel={picked ? "Your screenshots" : "Add screenshots"}
              style={styles.hero}
            >
              <Image
                source={{ uri: WINGMAN_HERO }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[
                  "rgba(92,28,88,0.62)",
                  "rgba(18,10,20,0.10)",
                  "rgba(16,8,16,0.55)",
                  "rgba(10,6,12,0.98)",
                ]}
                locations={[0, 0.32, 0.68, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.heroNav, { top: insets.top + 4 }]}>
                <View>
                  <Text style={styles.eyebrow}>WINGMAN</Text>
                  <Text style={styles.heroNavTitle}>Huru</Text>
                </View>
                <View style={styles.privateChip}>
                  <Ionicons name="sparkles" size={12} color={colors.ink} />
                  <Text style={styles.privateTxt}>Free</Text>
                </View>
              </View>
              {picked ? (
                <>
                  {shots.length > 1 ? (
                    <View style={styles.countChip}>
                      <Ionicons name="copy-outline" size={12} color={colors.text} />
                      <Text style={styles.countTxt}>+{shots.length - 1}</Text>
                    </View>
                  ) : null}

                  {processing ? (
                    <View style={styles.processing}>
                      <Text style={styles.processingTxt}>Reading your screenshots…</Text>
                      <ThinkingDots />
                    </View>
                  ) : (
                    <HeroCopy
                      title={shots.length > 1 ? `${shots.length} screenshots loaded` : "Screenshot in. Replies next."}
                      primaryLabel="Get my replies"
                      onPrimary={getReplies}
                      onSecondary={onPick}
                      secondaryLabel="Change"
                    />
                  )}
                </>
              ) : (
                <HeroCopy title="Send the text that lands." />
              )}
            </PressableScale>

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            {/* CAPTURE SHEET */}
            <View style={styles.sheet}>
              <View style={styles.sheetTop}>
                <View>
                  <Text style={styles.sheetKicker}>Free replies</Text>
                  <Text style={styles.sheetTitle}>Drop the conversation</Text>
                </View>
              </View>
              <View style={styles.captureActions}>
                <PressableScale
                  onPress={onPick}
                  hkind="light"
                  accessibilityRole="button"
                  accessibilityLabel="Add a screenshot"
                  style={styles.captureAction}
                >
                  <View style={[styles.captureIcon, { backgroundColor: colors.emberSoft }]}>
                    <Ionicons name="images" size={22} color={colors.lilac} />
                  </View>
                  <View style={styles.captureText}>
                    <Text style={styles.captureActionTxt}>{picked ? "Change screenshot" : "Add a screenshot"}</Text>
                    <Text style={styles.captureHint}>We'll read it and write your replies</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </PressableScale>
                <PressableScale
                  onPress={openPaste}
                  hkind="light"
                  accessibilityRole="button"
                  accessibilityLabel="Paste a chat"
                  style={styles.captureAction}
                >
                  <View style={[styles.captureIcon, { backgroundColor: "rgba(96,165,250,0.16)" }]}>
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.blue} />
                  </View>
                  <View style={styles.captureText}>
                    <Text style={styles.captureActionTxt}>Paste the chat</Text>
                    <Text style={styles.captureHint}>Or just type what they said</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </PressableScale>
              </View>
              {picked ? (
                <View style={styles.shotReady}>
                  <Image source={{ uri: shots[0]!.uri }} style={styles.shotThumb} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shotTitle}>
                      {shots.length > 1 ? `${shots.length} screenshots ready` : "Screenshot ready"}
                    </Text>
                    <Text style={styles.shotSub}>Tap below and we'll write three replies that sound like you.</Text>
                  </View>
                  <PressableScale onPress={getReplies} hkind="medium" style={styles.miniGo}>
                    <Ionicons name="arrow-forward" size={16} color={colors.ink} />
                  </PressableScale>
                </View>
              ) : null}
              {showPaste ? (
                <>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Paste messages</Text>
                  <PressableScale
                    onPress={() => {
                      setRaw(SAMPLE);
                      setErr(null);
                      haptic("light");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Use a sample conversation"
                  >
                    <Text style={styles.sampleLink}>Try a sample</Text>
                  </PressableScale>
                </View>
                <TextInput
                  value={raw}
                  onChangeText={(t) => {
                    setRaw(t);
                    if (err) setErr(null);
                  }}
                  multiline
                  placeholder={"them: haha prove it\nme: i mean my gym shoes have seen things"}
                  placeholderTextColor={colors.faint}
                  selectionColor={colors.lilac}
                  style={styles.area}
                  accessibilityLabel="Paste the conversation"
                />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional: where you met, their vibe, your goal…"
                  placeholderTextColor={colors.faint}
                  selectionColor={colors.lilac}
                  style={styles.noteInput}
                  accessibilityLabel="Context note"
                />
                <Button
                  label={raw.trim() ? "Get my replies" : shots.length > 0 ? "Read screenshot" : "Get my replies"}
                  onPress={goPaste}
                  style={{ marginTop: space.md }}
                />
                {err ? <Text style={styles.errText}>{err}</Text> : null}
                </>
              ) : null}
            </View>

            <OwnershipMoment
              agent={agent}
              loading={agentLoading}
              minting={agentMinting}
              error={agentError}
              onPress={claimChum}
              onOpen={() => router.push("/own")}
            />

            {/* QUICK ACTIONS */}
            <View style={styles.quickRow}>
              {QUICK.map((q) => (
                <PressableScale
                  key={q.label}
                  onPress={() => onQuick(q.label)}
                  hkind="light"
                  containerStyle={{ flex: 1 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${q.label} — ${q.hint}`}
                  style={styles.quick}
                >
                  <View style={styles.quickIcon}>
                    <Ionicons name={q.icon} size={22} color={colors.lilac} />
                  </View>
                  <Text style={styles.quickLbl}>{q.label}</Text>
                  <Text style={styles.quickHint}>{q.hint}</Text>
                </PressableScale>
              ))}
            </View>

            {/* LINES THAT LAND */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Lines that land</Text>
              <Text style={styles.sectionMeta}>real replies, your tone</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lineRow}
            >
              {LINES.map((l) => (
                <View key={l.tag} style={styles.lineCard}>
                  <View style={styles.lineTag}>
                    <Text style={styles.lineTagTxt}>{l.tag}</Text>
                  </View>
                  <Text style={styles.lineTxt}>{l.text}</Text>
                </View>
              ))}
            </ScrollView>

            {/* PRIVACY */}
            <View style={styles.privacy}>
              <Blob face="privacy" hue="lilac" size={56} glow={false} />
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyLbl}>Free — and truly private</Text>
                <Text style={styles.privacyTxt}>
                  Every reply is free. Your chats are read in a private, sealed space — never saved, never shared.
                </Text>
              </View>
            </View>

            <Text style={styles.trust}>Private by default · memory only when you allow it</Text>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function OwnershipMoment({
  agent,
  loading,
  minting,
  error,
  onPress,
  onOpen,
}: {
  agent: AgenticIdRecord | null;
  loading: boolean;
  minting: boolean;
  error: string | null;
  onPress: () => void;
  onOpen: () => void;
}) {
  const owned = agent?.status === "owned";
  const cta = owned ? "See your Chum" : minting ? "Setting it up…" : "Make it yours";

  return (
    <View style={styles.ownMoment}>
      <View style={styles.ownTop}>
        <View style={styles.ownIcon}>
          <Ionicons name={owned ? "checkmark" : "finger-print"} size={18} color={colors.ink} />
        </View>
        <View style={styles.ownStatus}>
          <Text style={styles.ownStatusTxt}>{owned ? "Yours" : loading ? "Checking…" : "Not yours yet"}</Text>
        </View>
      </View>
      <View style={styles.ownBody}>
        <Text style={styles.ownTitle} numberOfLines={2}>
          Yours to keep, forever.
        </Text>
        <Text style={styles.ownText}>
          The way it talks, what it remembers, everything you've taught it — locked to you, and yours to take anywhere.
        </Text>
        {error ? <Text style={styles.ownError}>{error}</Text> : null}
        <View style={styles.ownActions}>
          <PressableScale
            onPress={onPress}
            hkind="medium"
            accessibilityRole="button"
            accessibilityLabel={cta}
            style={styles.ownPrimary}
          >
            {minting ? <ThinkingDots /> : <Text style={styles.ownPrimaryTxt}>{cta}</Text>}
          </PressableScale>
          <PressableScale
            onPress={onOpen}
            hkind="light"
            accessibilityRole="button"
            accessibilityLabel="Open ownership details"
            style={styles.ownSecondary}
          >
            <Ionicons name="open-outline" size={17} color={colors.text} />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

function HeroCopy({
  title,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  title: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <View style={styles.heroCopy}>
      <Text style={styles.heroTitle} numberOfLines={2}>
        {title}
      </Text>
      {primaryLabel && onPrimary ? (
        <View style={styles.heroFootRow}>
          <Pill
            label={primaryLabel}
            trailingIcon="arrow-forward"
            onPress={onPrimary}
            accessibilityLabel={primaryLabel}
            style={{ flex: 1 }}
          />
          {secondaryLabel && onSecondary ? (
            <PressableScale
              onPress={onSecondary}
              hkind="light"
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
              style={styles.secondaryHeroBtn}
            >
              <Text style={styles.secondaryHeroTxt}>{secondaryLabel}</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// white-pill CTA (ink on white), supports a leading or trailing icon
function Pill({
  label,
  leadingIcon,
  trailingIcon,
  onPress,
  accessibilityLabel,
  style,
}: {
  label: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: object;
}) {
  return (
    <PressableScale
      onPress={onPress}
      hkind="medium"
      to={0.97}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, style]}
    >
      {leadingIcon ? <Ionicons name={leadingIcon} size={18} color={colors.ink} /> : null}
      <Text style={styles.pillTxt}>{label}</Text>
      {trailingIcon ? <Ionicons name={trailingIcon} size={17} color={colors.ink} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.lg, paddingTop: 0, paddingBottom: space.xxl, gap: space.lg },

  // header
  header: { flexDirection: "row", alignItems: "flex-start", gap: space.md, marginTop: space.xs },
  eyebrow: { ...type.label, color: "rgba(245,243,247,0.78)", marginBottom: 4 },
  title: { ...type.hero, color: colors.text },
  privateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  privateTxt: { ...type.meta, color: colors.ink, fontWeight: "800" },

  // hero capture card
  hero: {
    minHeight: 500,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: colors.card,
    overflow: "hidden",
    justifyContent: "flex-end",
    marginHorizontal: -space.lg,
  },
  heroNav: {
    position: "absolute",
    top: space.lg,
    left: space.lg,
    right: space.lg,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroNavTitle: { ...type.title, color: colors.text, fontSize: 25 },
  heroCopy: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: 54,
    zIndex: 2,
    gap: space.md,
  },
  heroEmpty: { alignItems: "center", paddingHorizontal: space.xl, paddingVertical: space.xl, gap: 4 },
  heroTitle: {
    ...type.largeTitle,
    color: colors.text,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.2,
    maxWidth: 320,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 2 },
  },
  heroSub: {
    ...type.bodyMed,
    color: "rgba(255,255,255,0.9)",
    maxWidth: 330,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 1 },
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(14,14,16,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    paddingVertical: 12,
    marginTop: space.xs,
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatValue: { ...type.heading, color: colors.text, fontSize: 16 },
  heroStatLabel: { ...type.meta, color: "rgba(245,243,247,0.6)" },
  heroStatDiv: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.12)" },
  secondaryHeroBtn: {
    height: 52,
    minWidth: 86,
    borderRadius: radius.pill,
    backgroundColor: "rgba(14,14,16,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  secondaryHeroTxt: { ...type.bodyMed, color: colors.text, fontWeight: "800" },
  ghostLink: { marginTop: space.md, paddingVertical: 6, paddingHorizontal: space.md },
  ghostLinkTxt: { ...type.footnote, color: colors.dim, fontWeight: "600" },

  countChip: {
    position: "absolute",
    top: space.lg,
    right: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(14,14,16,0.62)",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countTxt: { ...type.meta, color: colors.text },
  heroFoot: { position: "absolute", left: 0, right: 0, bottom: 0, padding: space.lg, gap: space.md },
  heroCap: { ...type.heading, color: colors.text },
  heroFootRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  changeBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: "rgba(14,14,16,0.55)",
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  processing: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    backgroundColor: "rgba(14,14,16,0.55)",
  },
  processingTxt: { ...type.heading, color: colors.text },

  // white pill
  pill: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: space.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  pillTxt: { ...type.bodyMed, fontWeight: "800", fontSize: 16, color: colors.ink },

  notice: { ...type.footnote, color: colors.dim, textAlign: "center", marginTop: -space.sm },

  // paste sheet
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    gap: space.md,
    marginTop: -34,
    zIndex: 5,
  },
  sheetTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.md },
  sheetKicker: { ...type.meta, color: colors.lilac, marginBottom: 3 },
  sheetTitle: { ...type.title3, color: colors.text },
  securePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(95,224,174,0.11)",
    borderWidth: 1,
    borderColor: "rgba(95,224,174,0.20)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secureTxt: { ...type.meta, color: colors.good },
  captureActions: { gap: 10 },
  captureAction: {
    borderRadius: 18,
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.hairline,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  captureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  captureText: { flex: 1, gap: 1 },
  captureActionTxt: { ...type.bodyMed, color: colors.text, fontWeight: "800", fontSize: 15 },
  captureHint: { ...type.meta, color: colors.muted },
  shotReady: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.emberLine,
    borderRadius: 22,
    padding: space.sm,
  },
  shotThumb: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.cardHi },
  shotTitle: { ...type.heading, color: colors.text, fontSize: 15 },
  shotSub: { ...type.footnote, color: colors.dim, marginTop: 2 },
  miniGo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs },
  fieldLabel: { ...type.label, color: colors.dim },
  sampleLink: { ...type.footnote, color: colors.lilac, fontWeight: "600" },
  area: {
    backgroundColor: colors.well,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    minHeight: 110,
    color: colors.text,
    ...type.body,
    textAlignVertical: "top",
  },
  noteInput: {
    backgroundColor: colors.well,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    color: colors.text,
    ...type.body,
  },
  errText: { ...type.footnote, color: colors.bad, textAlign: "center", marginTop: space.sm },

  // ownership
  ownMoment: {
    minHeight: 330,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    padding: space.lg,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  ownTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  ownIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  ownStatus: {
    borderRadius: radius.pill,
    backgroundColor: "rgba(14,14,16,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ownStatusTxt: { ...type.meta, color: colors.text },
  ownBody: { gap: space.md, zIndex: 2 },
  ownTitle: {
    ...type.largeTitle,
    color: colors.text,
    fontSize: 33,
    lineHeight: 37,
    maxWidth: 320,
  },
  ownText: { ...type.bodyMed, color: "rgba(245,243,247,0.80)", maxWidth: 330 },
  ownRail: { flexDirection: "row", gap: space.sm },
  miniProof: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "rgba(14,14,16,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: space.md,
    paddingVertical: 9,
    justifyContent: "center",
  },
  miniProofValue: { ...type.heading, color: colors.text, fontSize: 14 },
  miniProofLabel: { ...type.meta, color: "rgba(245,243,247,0.56)", marginTop: 1 },
  ownError: { ...type.footnote, color: colors.bad },
  ownActions: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  ownPrimary: {
    flex: 1,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  ownPrimaryTxt: { ...type.bodyMed, color: colors.ink, fontWeight: "800", fontSize: 16 },
  ownSecondary: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: "rgba(14,14,16,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  // quick actions
  quickRow: { flexDirection: "row", gap: space.md },
  quick: {
    minHeight: 150,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 24,
    padding: space.md,
    overflow: "hidden",
  },
  quickIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.emberSoft, alignItems: "center", justifyContent: "center" },
  quickLbl: { ...type.heading, color: colors.text, fontSize: 15 },
  quickHint: { ...type.meta, color: "rgba(245,243,247,0.62)" },

  // sections
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: space.sm },
  sectionTitle: { ...type.title3, color: colors.text },
  sectionMeta: { ...type.meta, color: colors.muted },

  // lines that land
  lineRow: { gap: space.md, paddingVertical: 2, paddingRight: space.sm },
  lineCard: {
    width: 230,
    minHeight: 136,
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 24,
    padding: space.lg,
    gap: space.md,
  },
  lineTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.emberSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lineTagTxt: { ...type.meta, color: colors.lilac, fontSize: 10, letterSpacing: 0.8 },
  lineTxt: { ...type.bodyMed, color: colors.text },

  // privacy
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 24,
    padding: space.lg,
    marginTop: space.sm,
  },
  privacyLbl: { ...type.heading, color: colors.text, marginBottom: 5 },
  privacyTxt: { ...type.footnote, color: colors.dim },

  trust: { ...type.footnote, color: colors.faint, textAlign: "center", marginTop: space.md },
});
