import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";

interface Credit { id: string; amount: number; status: string }
interface Project {
  id: string;
  title: string;
  status: string;
  country: string;
  hectares: number;
  estimatedTons: number;
  projectType?: string;
  landType?: string | null;
  energyType?: string | null;
  verifications?: { status: string; carbonTons: number | null }[];
  credits?: Credit[];
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING:      { bg: "#fef9c3", fg: "#854d0e", label: "Pending review" },
  UNDER_REVIEW: { bg: "#dbeafe", fg: "#1e40af", label: "Under review" },
  VERIFIED:     { bg: "#dcfce7", fg: "#166534", label: "Verified" },
  ACTIVE:       { bg: "#dcfce7", fg: "#166534", label: "Active" },
  REJECTED:     { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" },
  COMPLETED:    { bg: "#f3f4f6", fg: "#374151", label: "Completed" },
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<Project[]>("/api/projects/me/projects");
      setProjects(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your projects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload each time the screen regains focus (e.g. after admin approval).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalCredits = projects.reduce((sum, p) => sum + (p.credits ?? []).reduce((s, c) => s + c.amount, 0), 0);
  const verifiedCount = projects.filter(p => p.status === "VERIFIED" || p.status === "ACTIVE").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi, {user?.name?.split(" ")[0] ?? "there"}</Text>
          <Text style={styles.headerSub}>Your projects</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
            <Text style={styles.settingsLink}>Settings</Text>
          </Pressable>
          <Pressable onPress={async () => { try { await signOut(); } finally { router.replace("/login"); } }} hitSlop={10}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <SummaryCard label="Projects" value={String(projects.length)} />
        <SummaryCard label="Verified" value={String(verifiedCount)} />
        <SummaryCard label="Credits (t)" value={totalCredits.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.forest600} size="large" /></View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.forest600} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No projects yet</Text>
                  <Text style={styles.emptyBody}>Register your first project to start earning carbon credits.</Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const s = STATUS_STYLE[item.status] ?? { bg: "#f3f4f6", fg: "#374151", label: item.status };
            const tons = item.verifications?.[0]?.carbonTons ?? item.estimatedTons;
            return (
              <Pressable style={styles.card} onPress={() => router.push(`/project/${item.id}`)}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>{item.country} · {item.hectares} ha</Text>
                <Text style={styles.cardTons}>
                  {item.verifications?.[0]?.carbonTons != null ? "Verified " : "Est. "}
                  {tons?.toLocaleString(undefined, { maximumFractionDigits: 1 })} t CO₂e
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {/* New project FAB (project creation screen comes next) */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => router.push("/project/new")}>
        <Text style={styles.fabPlus}>＋</Text>
        <Text style={styles.fabText}>New project</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  hello: { fontSize: 20, fontWeight: "900", color: colors.ink },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  signOut: { fontSize: 14, color: colors.red, fontWeight: "600" },
  settingsLink: { fontSize: 14, color: colors.forest700, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 4 },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, alignItems: "center" },
  summaryValue: { fontSize: 20, fontWeight: "900", color: colors.ink },
  summaryLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardMeta: { fontSize: 13, color: colors.muted, marginTop: 6 },
  cardTons: { fontSize: 13, color: colors.forest700, fontWeight: "600", marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.body },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6 },
  errorText: { fontSize: 14, color: colors.red, textAlign: "center" },
  fab: { position: "absolute", right: 16, bottom: 24, backgroundColor: colors.forest600, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 14, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  fabPlus: { color: "#fff", fontSize: 18, fontWeight: "900" },
  fabText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
