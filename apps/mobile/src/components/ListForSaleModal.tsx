import { useState } from "react";
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";

// Lists an AVAILABLE carbon credit on the marketplace. Backend: POST /api/marketplace
// (owner-only, validates ownership + that tons <= credit balance).
export default function ListForSaleModal({
  credit, projectTitle, onClose, onListed,
}: {
  credit: { id: string; amount: number };
  projectTitle: string;
  onClose: () => void;
  onListed: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [price, setPrice] = useState("12");
  const [tons, setTons] = useState(String(credit.amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNum = parseFloat(price);
  const tonsNum = parseFloat(tons);
  const valid = priceNum > 0 && tonsNum > 0 && tonsNum <= credit.amount;
  const gross = valid ? priceNum * tonsNum : 0;

  async function submit() {
    if (!(priceNum > 0)) { setError("Enter a price per tonne."); return; }
    if (!(tonsNum > 0 && tonsNum <= credit.amount)) { setError(`Tonnes must be between 0 and ${credit.amount}.`); return; }
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/marketplace", {
        creditId: credit.id,
        pricePerTon: priceNum,
        totalTons: tonsNum,
        currency: "USDC",
      });
      onListed();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't list credits");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>List credits for sale</Text>
        <Text style={styles.sub}>{projectTitle} · {credit.amount} t available</Text>

        <Text style={styles.label}>Price per tonne (USDC)</Text>
        <View style={styles.presetRow}>
          {["8", "12", "18"].map((p) => (
            <Pressable key={p} onPress={() => setPrice(p)} style={[styles.preset, price === p && styles.presetActive]}>
              <Text style={[styles.presetText, price === p && styles.presetTextActive]}>${p}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="12.00" placeholderTextColor={colors.faint} />

        <Text style={[styles.label, { marginTop: 14 }]}>Tonnes to list</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={tons} onChangeText={setTons} placeholder={String(credit.amount)} placeholderTextColor={colors.faint} />

        {valid && (
          <Text style={styles.gross}>Listed value: <Text style={{ fontWeight: "800", color: colors.ink }}>${gross.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC</Text></Text>
        )}
        {error && <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View>}

        <View style={styles.actions}>
          <Pressable style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          <Pressable style={[styles.submit, (!valid || saving) && { opacity: 0.5 }]} onPress={submit} disabled={!valid || saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>List for sale</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 36 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 },
  title: { fontSize: 19, fontWeight: "900", color: colors.ink },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.body, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  preset: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  presetActive: { borderColor: colors.forest600, backgroundColor: colors.forest50 },
  presetText: { fontWeight: "700", color: colors.body },
  presetTextActive: { color: colors.forest700 },
  gross: { fontSize: 13, color: colors.muted, marginTop: 12 },
  errBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 10, padding: 10, marginTop: 12 },
  errText: { color: "#b91c1c", fontSize: 13 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancel: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  cancelText: { fontWeight: "700", color: colors.body },
  submit: { flex: 1.4, backgroundColor: colors.forest600, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
