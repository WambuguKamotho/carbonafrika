import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/config";
import { ApiError } from "@/lib/api";

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { unsupported } = useLocalSearchParams<{ unsupported?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    unsupported ? "This account type isn't supported in the app yet. Project Owners only for now." : null,
  );

  async function submit() {
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    setError(null);
    try {
      const user = await signIn(email.trim(), password);
      if (user.role === "LANDOWNER") router.replace("/dashboard");
      else { setError("This account type isn't supported in the app yet. Project Owners only for now."); }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.forest900 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoLeaf}>🌿</Text></View>
          <Text style={styles.brand}>Kabon.Africa</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your projects</Text>

        <View style={styles.card}>
          {error && (
            <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.faint}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>

          <Pressable onPress={() => router.push("/forgot-password")} style={{ marginTop: 14 }}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          New here? Register your project at kabon.africa, then sign in to track it on the go.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 28 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.forest600, alignItems: "center", justifyContent: "center" },
  logoLeaf: { fontSize: 18 },
  brand: { color: "#fff", fontSize: 22, fontWeight: "900" },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#86efac", fontSize: 15, textAlign: "center", marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  label: { color: colors.body, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  button: { backgroundColor: colors.forest600, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  forgot: { color: colors.forest700, fontWeight: "600", fontSize: 14, textAlign: "center" },
  errorBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: "#b91c1c", fontSize: 13 },
  footnote: { color: "#86efac", fontSize: 12, textAlign: "center", marginTop: 24, lineHeight: 18 },
});
