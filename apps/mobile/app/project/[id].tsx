import { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";
import ListForSaleModal from "@/components/ListForSaleModal";

interface ProjectDetail {
  id: string; title: string; description: string; status: string;
  country: string; region?: string | null; hectares: number; estimatedTons: number;
  verifications?: { status: string; carbonTons: number | null }[];
  credits?: { id: string; amount: number; status: string }[];
}

// GET /api/projects/:id only returns AVAILABLE credits, so any credit here is listable.


interface Comment {
  id: string; body: string; kind: string; createdAt: string;
  author: { id: string; name: string; role: string };
}

interface Snapshot { id: string; ndvi: number; cloudCover: number; capturedAt: string }
interface Reading {
  id: string; recordedAt: string;
  kwhGenerated?: number | null; co2AvoidedKg?: number | null;
  temperatureC?: number | null; humidityPct?: number | null;
  soilMoisturePct?: number | null; rainfallMm?: number | null;
  device?: { deviceType: string; label: string | null };
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING:      { bg: "#fef9c3", fg: "#854d0e", label: "Pending review" },
  UNDER_REVIEW: { bg: "#dbeafe", fg: "#1e40af", label: "Under review" },
  VERIFIED:     { bg: "#dcfce7", fg: "#166534", label: "Verified" },
  ACTIVE:       { bg: "#dcfce7", fg: "#166534", label: "Active" },
  REJECTED:     { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" },
  COMPLETED:    { bg: "#f3f4f6", fg: "#374151", label: "Completed" },
};

// System-event comments render with a tint + label; plain "comment" is a chat bubble.
const KIND_LABEL: Record<string, string> = {
  approval: "Admin approved",
  rejection: "Admin rejected",
  verification_approved: "Assessment approved",
  verification_rejected: "Assessment rejected",
  credits_issued: "Credits issued",
};

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      // Independent fetches — satellite/IoT/comments are decorative; a failure in
      // any one shouldn't blank the page.
      const [proj, cmts, sats, reads] = await Promise.allSettled([
        api.get<ProjectDetail>(`/api/projects/${id}`),
        api.get<Comment[]>(`/api/projects/${id}/comments`),
        api.get<Snapshot[]>(`/api/projects/${id}/satellites`),
        api.get<Reading[]>(`/api/iot/projects/${id}/readings?limit=50`),
      ]);
      if (proj.status === "fulfilled") setProject(proj.value);
      else throw proj.reason;
      if (cmts.status === "fulfilled") setComments(cmts.value);
      if (sats.status === "fulfilled") setSnapshots(sats.value);
      if (reads.status === "fulfilled") setReadings(reads.value);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function postComment() {
    if (!draft.trim()) return;
    setPosting(true);
    try {
      const created = await api.post<Comment>(`/api/projects/${id}/comments`, { body: draft.trim() });
      setComments(prev => [...prev, created]);
      setDraft("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't post comment");
    } finally {
      setPosting(false);
    }
  }

  const s = project ? STATUS_STYLE[project.status] ?? { bg: "#f3f4f6", fg: "#374151", label: project.status } : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹ Back</Text></Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.forest600} size="large" /></View>
      ) : error && !project ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : project ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <Text style={styles.title}>{project.title}</Text>
              {s && <View style={[styles.badge, { backgroundColor: s.bg }]}><Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text></View>}
            </View>
            <Text style={styles.meta}>{project.country}{project.region ? ` · ${project.region}` : ""} · {project.hectares} ha</Text>

            <View style={styles.statRow}>
              <Stat label="Estimated" value={`${project.estimatedTons?.toLocaleString(undefined, { maximumFractionDigits: 1 })} t`} />
              <Stat label="Verified" value={project.verifications?.[0]?.carbonTons != null ? `${project.verifications[0].carbonTons.toLocaleString()} t` : "—"} />
              <Stat label="Credits" value={String((project.credits ?? []).length)} />
            </View>

            {(project.credits?.length ?? 0) > 0 && (
              <Pressable style={styles.listBtn} onPress={() => setListOpen(true)}>
                <Text style={styles.listBtnText}>
                  💰 List {project.credits![0].amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} t for sale
                </Text>
              </Pressable>
            )}

            {project.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.body}>{project.description}</Text>
              </View>
            ) : null}

            {/* Satellite / NDVI */}
            {snapshots.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vegetation (NDVI)</Text>
                <View style={styles.ndviCard}>
                  <View>
                    <Text style={styles.ndviValue}>{snapshots[0].ndvi.toFixed(3)}</Text>
                    <Text style={styles.ndviMeta}>
                      latest · {new Date(snapshots[0].capturedAt).toLocaleDateString()} · {Math.round(snapshots[0].cloudCover)}% cloud
                    </Text>
                  </View>
                  <View style={styles.ndviSpark}>
                    {snapshots.slice(0, 8).reverse().map((s) => (
                      <View key={s.id} style={[styles.sparkBar, { height: 8 + Math.max(0, Math.min(1, s.ndvi)) * 36 }]} />
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* IoT readings */}
            {readings.length > 0 && (() => {
              const r = readings[0];
              const metrics = [
                r.kwhGenerated != null && { label: "kWh", value: r.kwhGenerated.toFixed(1) },
                r.co2AvoidedKg != null && { label: "CO₂ avoided (kg)", value: r.co2AvoidedKg.toFixed(1) },
                r.temperatureC != null && { label: "Temp °C", value: r.temperatureC.toFixed(1) },
                r.humidityPct != null && { label: "Humidity %", value: r.humidityPct.toFixed(0) },
                r.soilMoisturePct != null && { label: "Soil %", value: r.soilMoisturePct.toFixed(0) },
                r.rainfallMm != null && { label: "Rain mm", value: r.rainfallMm.toFixed(1) },
              ].filter(Boolean) as { label: string; value: string }[];
              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Live sensors</Text>
                  <Text style={styles.hint}>{readings.length} recent readings · last {new Date(r.recordedAt).toLocaleString()}</Text>
                  <View style={styles.metricGrid}>
                    {metrics.map((m) => (
                      <View key={m.label} style={styles.metric}>
                        <Text style={styles.metricValue}>{m.value}</Text>
                        <Text style={styles.metricLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* Comment thread */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Review thread</Text>
            {comments.length === 0 ? (
              <Text style={styles.hint}>No messages yet. Use this thread to talk to the Kabon review team.</Text>
            ) : (
              <View style={{ gap: 10, marginTop: 8 }}>
                {comments.map(c => {
                  const isSystem = c.kind !== "comment";
                  const mine = c.author.role === "LANDOWNER";
                  return (
                    <View key={c.id} style={[styles.bubble, isSystem ? styles.bubbleSystem : mine ? styles.bubbleMine : styles.bubbleOther]}>
                      {isSystem && <Text style={styles.systemTag}>{KIND_LABEL[c.kind] ?? c.kind}</Text>}
                      <Text style={styles.bubbleAuthor}>{c.author.name} · {c.author.role === "ADMIN" ? "Kabon" : "You"}</Text>
                      <Text style={styles.bubbleBody}>{c.body}</Text>
                      <Text style={styles.bubbleTime}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Composer */}
          <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
            <TextInput
              style={styles.composerInput}
              placeholder="Message the review team…"
              placeholderTextColor={colors.faint}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable style={[styles.send, (!draft.trim() || posting) && { opacity: 0.5 }]} onPress={postComment} disabled={!draft.trim() || posting}>
              {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Send</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {toast && (
        <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>
      )}

      {listOpen && project && (project.credits?.length ?? 0) > 0 && (
        <ListForSaleModal
          credit={{ id: project.credits![0].id, amount: project.credits![0].amount }}
          projectTitle={project.title}
          onClose={() => setListOpen(false)}
          onListed={() => {
            setListOpen(false);
            setToast("Listed on the marketplace ✓");
            setTimeout(() => setToast(null), 3500);
            load();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topbar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { fontSize: 16, color: colors.forest700, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { color: colors.red, fontSize: 14, textAlign: "center" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 22, fontWeight: "900", color: colors.ink, flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 14, color: colors.muted, marginTop: 6 },
  statRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "900", color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 6 },
  body: { fontSize: 15, color: colors.body, lineHeight: 22 },
  hint: { fontSize: 13, color: colors.faint, marginTop: 8 },
  listBtn: { backgroundColor: colors.forest600, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  listBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  toast: { position: "absolute", top: 70, alignSelf: "center", backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  ndviCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 16, marginTop: 8 },
  ndviValue: { fontSize: 26, fontWeight: "900", color: colors.forest700 },
  ndviMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  ndviSpark: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 46 },
  sparkBar: { width: 7, borderRadius: 3, backgroundColor: colors.forest600 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  metric: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, minWidth: 96 },
  metricValue: { fontSize: 18, fontWeight: "800", color: colors.ink },
  metricLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  bubble: { borderRadius: 14, padding: 12 },
  bubbleMine: { backgroundColor: colors.forest50, borderWidth: 1, borderColor: "#bbf7d0" },
  bubbleOther: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  bubbleSystem: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: colors.line },
  systemTag: { fontSize: 10, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  bubbleAuthor: { fontSize: 12, fontWeight: "700", color: colors.body },
  bubbleBody: { fontSize: 14, color: colors.ink, marginTop: 3, lineHeight: 20 },
  bubbleTime: { fontSize: 11, color: colors.faint, marginTop: 5 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  composerInput: { flex: 1, maxHeight: 110, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink },
  send: { backgroundColor: colors.forest600, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
