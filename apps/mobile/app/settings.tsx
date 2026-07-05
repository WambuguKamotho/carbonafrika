import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome6 } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";

const SOCIAL_LINKS: { name: string; icon: React.ComponentProps<typeof FontAwesome6>["name"]; href: string }[] = [
  { name: "Bluesky", icon: "bluesky", href: "https://bsky.app/profile/kabonafrica.bsky.social" },
  { name: "Facebook", icon: "facebook", href: "https://www.facebook.com/kabon.africa" },
  { name: "Instagram", icon: "instagram", href: "https://www.instagram.com/kabon.africa" },
  { name: "TikTok", icon: "tiktok", href: "https://www.tiktok.com/@kabon.africa" },
  { name: "Threads", icon: "threads", href: "https://www.threads.net/@kabon.africa" },
];

interface Me {
  id: string; name: string; email: string | null; role: string;
  phone?: string | null; country?: string | null; bio?: string | null;
  kycVerified?: boolean; kycRequestedAt?: string | null;
}

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // profile form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // password form
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [kycBusy, setKycBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    try {
      const data = await api.get<Me>("/api/auth/me");
      setMe(data);
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setCountry(data.country ?? "");
      setBio(data.bio ?? "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your profile");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSavingProfile(true); setError(null);
    try {
      await api.patch("/api/auth/me", {
        name: name.trim(),
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      notify("Profile saved ✓");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't save profile"); }
    finally { setSavingProfile(false); }
  }

  async function changePassword() {
    if (!curPw || newPw.length < 8) { setError("Enter your current password and a new one (min 8 chars)."); return; }
    setSavingPw(true); setError(null);
    try {
      await api.post("/api/auth/me/change-password", { currentPassword: curPw, newPassword: newPw });
      setCurPw(""); setNewPw("");
      notify("Password changed ✓");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't change password"); }
    finally { setSavingPw(false); }
  }

  async function submitKyc() {
    setKycBusy(true); setError(null);
    try {
      await api.post("/api/auth/me/kyc/request", {});
      await load();
      notify("Submitted for verification ✓");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't submit KYC"); }
    finally { setKycBusy(false); }
  }

  const kycState = me?.kycVerified ? "verified" : me?.kycRequestedAt ? "pending" : "none";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹ Back</Text></Pressable>
        <Text style={styles.topTitle}>Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.forest600} size="large" /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 48 }} keyboardShouldPersistTaps="handled">
            {error && <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View>}

            <View style={styles.identity}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(me?.name ?? "?").charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.idName}>{me?.name}</Text>
                <Text style={styles.idMeta}>{me?.email} · {me?.role}</Text>
              </View>
            </View>

            {/* KYC */}
            <Text style={styles.section}>Verification</Text>
            <View style={styles.card}>
              {kycState === "verified" ? (
                <Text style={[styles.kyc, { color: colors.forest700 }]}>✓ Your account is verified.</Text>
              ) : kycState === "pending" ? (
                <Text style={[styles.kyc, { color: colors.yellow }]}>⏳ Submitted — under review by Kabon.</Text>
              ) : (
                <>
                  <Text style={styles.kycHint}>Submit your account for verification to participate fully.</Text>
                  <Pressable style={styles.primary} onPress={submitKyc} disabled={kycBusy}>
                    {kycBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit for verification</Text>}
                  </Pressable>
                </>
              )}
            </View>

            {/* Profile */}
            <Text style={styles.section}>Profile</Text>
            <View style={styles.card}>
              <Field label="Full / community name" value={name} onChangeText={setName} />
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field label="Country" value={country} onChangeText={setCountry} />
              <Field label="Bio" value={bio} onChangeText={setBio} multiline />
              <Pressable style={[styles.primary, savingProfile && { opacity: 0.6 }]} onPress={saveProfile} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save profile</Text>}
              </Pressable>
            </View>

            {/* Password */}
            <Text style={styles.section}>Change password</Text>
            <View style={styles.card}>
              <Field label="Current password" value={curPw} onChangeText={setCurPw} secureTextEntry />
              <Field label="New password (min 8)" value={newPw} onChangeText={setNewPw} secureTextEntry />
              <Pressable style={[styles.primary, savingPw && { opacity: 0.6 }]} onPress={changePassword} disabled={savingPw}>
                {savingPw ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Update password</Text>}
              </Pressable>
            </View>

            {/* Follow us */}
            <Text style={styles.section}>Follow us</Text>
            <View style={styles.socialRow}>
              {SOCIAL_LINKS.map(({ name, icon, href }) => (
                <Pressable
                  key={name}
                  onPress={() => Linking.openURL(href)}
                  style={styles.socialBtn}
                  accessibilityLabel={`Kabon.Africa on ${name}`}
                >
                  <FontAwesome6 name={icon} brand size={18} color={colors.body} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {toast && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}
    </SafeAreaView>
  );
}

function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.faint}
        multiline={multiline}
        style={[styles.input, multiline && { height: 80, textAlignVertical: "top" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { fontSize: 16, color: colors.forest700, fontWeight: "600", width: 48 },
  topTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  identity: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.forest600, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  idName: { fontSize: 17, fontWeight: "800", color: colors.ink },
  idMeta: { fontSize: 13, color: colors.muted, marginTop: 1 },
  section: { fontSize: 12, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.body, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: colors.ink },
  primary: { backgroundColor: colors.forest600, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  kyc: { fontSize: 15, fontWeight: "700" },
  kycHint: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  socialRow: { flexDirection: "row", gap: 12, justifyContent: "center" },
  socialBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  errBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 12, marginBottom: 12 },
  errText: { color: "#b91c1c", fontSize: 13 },
  toast: { position: "absolute", top: 70, alignSelf: "center", backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
