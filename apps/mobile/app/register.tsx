import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";

const AFRICAN_COUNTRIES = [
  "Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Cape Verde",
  "Central African Republic","Chad","Côte d'Ivoire","DR Congo","Djibouti","Egypt",
  "Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana",
  "Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar",
  "Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia",
  "Niger","Nigeria","Rwanda","Senegal","Sierra Leone","Somalia","South Africa",
  "South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
].sort();

export default function Register() {
  const router = useRouter();

  const [form, setForm] = useState({ name: "", email: "", password: "", country: "" });
  const [countryOpen, setCountryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const set = (field: keyof typeof form) => (val: string) =>
    setForm(f => ({ ...f, [field]: val }));

  async function submit() {
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    if (!form.email.trim()) { setError("Please enter your email."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!form.country) { setError("Please select your country."); return; }

    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        country: form.country,
        role: "LANDOWNER",
      });
      setSubmittedEmail(form.email.trim());
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.forest900, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={[styles.card, { alignItems: "center" }]}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📧</Text>
          <Text style={{ fontSize: 22, fontWeight: "900", color: colors.ink, textAlign: "center", marginBottom: 8 }}>
            Check your inbox
          </Text>
          <Text style={{ fontSize: 14, color: colors.body, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
            We sent a verification link to{"\n"}
            <Text style={{ fontWeight: "700", color: colors.ink }}>{submittedEmail}</Text>
            {"\n\n"}Tap the link in that email to activate your account. The link expires in 24 hours.
          </Text>
          <Text style={{ fontSize: 12, color: colors.faint, textAlign: "center", marginBottom: 24 }}>
            Didn't get it? Check your spam folder or go to kabon.africa/verify-email to request a new link.
          </Text>
          <Pressable style={styles.button} onPress={() => router.push("/login")}>
            <Text style={styles.buttonText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (countryOpen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select your country</Text>
          <Pressable onPress={() => setCountryOpen(false)}>
            <Text style={styles.pickerCancel}>Cancel</Text>
          </Pressable>
        </View>
        <ScrollView>
          {AFRICAN_COUNTRIES.map(c => (
            <Pressable
              key={c}
              style={[styles.pickerRow, form.country === c && styles.pickerRowSelected]}
              onPress={() => { set("country")(c); setCountryOpen(false); }}
            >
              <Text style={[styles.pickerRowText, form.country === c && { color: colors.forest700, fontWeight: "700" }]}>{c}</Text>
              {form.country === c && <Text style={{ color: colors.forest600 }}>✓</Text>}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.forest900 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoLeaf}>🌿</Text></View>
          <Text style={styles.brand}>Kabon.Africa</Text>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Register your land, earn carbon credits</Text>

        <View style={styles.card}>
          {error && (
            <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
          )}

          <Text style={styles.label}>Full name / Community name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mama Wanjiru or Kajiado Community"
            placeholderTextColor={colors.faint}
            autoCapitalize="words"
            value={form.name}
            onChangeText={set("name")}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={form.email}
            onChangeText={set("email")}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.faint}
            secureTextEntry
            autoComplete="new-password"
            value={form.password}
            onChangeText={set("password")}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Country</Text>
          <Pressable style={[styles.input, styles.picker]} onPress={() => setCountryOpen(true)}>
            <Text style={form.country ? { color: colors.ink, fontSize: 16 } : { color: colors.faint, fontSize: 16 }}>
              {form.country || "Select your country"}
            </Text>
            <Text style={{ color: colors.faint }}>▾</Text>
          </Pressable>

          <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Free Account</Text>}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/login")} style={{ marginTop: 20 }}>
          <Text style={styles.footnote}>
            Already have an account? <Text style={{ fontWeight: "700", color: "#86efac" }}>Sign in</Text>
          </Text>
        </Pressable>
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
  picker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  button: { backgroundColor: colors.forest600, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: "#b91c1c", fontSize: 13 },
  footnote: { color: "#86efac", fontSize: 13, textAlign: "center" },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: "#fff" },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  pickerCancel: { fontSize: 15, color: colors.forest700, fontWeight: "600" },
  pickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: "#fff" },
  pickerRowSelected: { backgroundColor: colors.forest50 },
  pickerRowText: { fontSize: 16, color: colors.ink },
});
