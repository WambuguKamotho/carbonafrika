import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) { setError("Enter your email."); return; }
    setLoading(true); setError(null);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      setDone(true);
    } catch (e) {
      // The endpoint is intentionally vague; only surface real network errors.
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹ Back</Text></Pressable>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Reset your password</Text>
          {done ? (
            <Text style={styles.note}>
              If an account exists for <Text style={{ fontWeight: "700" }}>{email.trim()}</Text>, we've sent a reset link.
              Check your email (and spam) and follow the link to set a new password.
            </Text>
          ) : (
            <>
              <Text style={styles.note}>Enter the email on your account and we'll send a reset link.</Text>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input} value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address" autoComplete="email"
                placeholder="you@example.com" placeholderTextColor={colors.faint}
              />
              {error && <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View>}
              <Pressable style={[styles.primary, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send reset link</Text>}
              </Pressable>
            </>
          )}
          <Pressable onPress={() => router.replace("/login")} style={{ marginTop: 20 }}>
            <Text style={styles.backToLogin}>Back to sign in</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topbar: { paddingHorizontal: 16, paddingVertical: 12 },
  back: { fontSize: 16, color: colors.forest700, fontWeight: "600" },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: "center", paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: "900", color: colors.ink, marginBottom: 8 },
  note: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: colors.body, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink, backgroundColor: colors.white },
  primary: { backgroundColor: colors.forest600, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 18 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backToLogin: { color: colors.forest700, fontWeight: "600", textAlign: "center" },
  errBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 12, marginTop: 14 },
  errText: { color: "#b91c1c", fontSize: 13 },
});
