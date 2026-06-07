import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "@/lib/config";

interface Practice {
  label: string;
  unit: string;
  unitLabel: string;
  tMin: number;
  tMax: number;
  emoji: string;
}

const PRACTICES: Record<string, Practice> = {
  FOREST:     { label: "Community Forest",     unit: "ha",    unitLabel: "Hectares",    tMin: 3,   tMax: 10,  emoji: "🌳" },
  SAVANNA:    { label: "Savanna Management",   unit: "ha",    unitLabel: "Hectares",    tMin: 0.5, tMax: 3,   emoji: "🌿" },
  GRASSLAND:  { label: "Grassland / No-Till",  unit: "ha",    unitLabel: "Hectares",    tMin: 0.5, tMax: 2,   emoji: "🌾" },
  FARMLAND:   { label: "Agroforestry",         unit: "ha",    unitLabel: "Hectares",    tMin: 2,   tMax: 5,   emoji: "🌱" },
  WETLAND:    { label: "Wetland Restoration",  unit: "ha",    unitLabel: "Hectares",    tMin: 5,   tMax: 20,  emoji: "💧" },
  MANGROVE:   { label: "Mangrove Restoration", unit: "ha",    unitLabel: "Hectares",    tMin: 5,   tMax: 20,  emoji: "🌊" },
  SOLAR_PV:   { label: "Solar PV",             unit: "kW",    unitLabel: "Capacity kW", tMin: 0.5, tMax: 2,   emoji: "☀️" },
  BIOGAS:     { label: "Biogas Plant",          unit: "units", unitLabel: "Digesters",   tMin: 1,   tMax: 5,   emoji: "🔥" },
  COOKSTOVES: { label: "Clean Cookstoves",     unit: "units", unitLabel: "Stoves",      tMin: 1,   tMax: 3,   emoji: "🍳" },
};

const LAND_TYPES  = ["FOREST","SAVANNA","GRASSLAND","FARMLAND","WETLAND","MANGROVE"];
const ENERGY_TYPES = ["SOLAR_PV","BIOGAS","COOKSTOVES"];

const PRICES = [8, 10, 12, 15, 18, 20, 25, 28];

export default function CalculatorScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState("FARMLAND");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(15);
  const [priceOpen, setPriceOpen] = useState(false);

  const cfg = PRACTICES[selected];
  const qty = parseFloat(quantity) || 0;
  const low  = qty * cfg.tMin;
  const high = qty * cfg.tMax;
  const mid  = (low + high) / 2;
  const hasResult = qty > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Earnings Calculator</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>LAND RESTORATION</Text>
        <View style={styles.typeGrid}>
          {LAND_TYPES.map(k => (
            <Pressable
              key={k}
              style={[styles.typeChip, selected === k && styles.typeChipActive]}
              onPress={() => { setSelected(k); setQuantity(""); }}
            >
              <Text style={styles.typeEmoji}>{PRACTICES[k].emoji}</Text>
              <Text style={[styles.typeLabel, selected === k && styles.typeLabelActive]} numberOfLines={2}>
                {PRACTICES[k].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>CLEAN ENERGY</Text>
        <View style={styles.typeGrid}>
          {ENERGY_TYPES.map(k => (
            <Pressable
              key={k}
              style={[styles.typeChip, selected === k && styles.typeChipActive]}
              onPress={() => { setSelected(k); setQuantity(""); }}
            >
              <Text style={styles.typeEmoji}>{PRACTICES[k].emoji}</Text>
              <Text style={[styles.typeLabel, selected === k && styles.typeLabelActive]} numberOfLines={2}>
                {PRACTICES[k].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{cfg.unitLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${cfg.unitLabel.toLowerCase()}`}
            placeholderTextColor={colors.faint}
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Text style={[styles.cardLabel, { marginTop: 16 }]}>Price per tonne CO₂</Text>
          <Pressable style={styles.pricePicker} onPress={() => setPriceOpen(!priceOpen)}>
            <Text style={styles.priceValue}>${price} / tonne</Text>
            <Text style={{ color: colors.muted }}>▾</Text>
          </Pressable>
          {priceOpen && (
            <View style={styles.priceDropdown}>
              {PRICES.map(p => (
                <Pressable
                  key={p}
                  style={[styles.priceOption, price === p && styles.priceOptionActive]}
                  onPress={() => { setPrice(p); setPriceOpen(false); }}
                >
                  <Text style={[styles.priceOptionText, price === p && { color: colors.forest700, fontWeight: "700" }]}>
                    ${p} / tonne
                  </Text>
                  {price === p && <Text style={{ color: colors.forest600 }}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {hasResult ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Estimated Annual Earnings</Text>
            <View style={styles.resultRow}>
              <View style={styles.resultStat}>
                <Text style={styles.resultValue}>{low.toFixed(0)}–{high.toFixed(0)} t</Text>
                <Text style={styles.resultKey}>CO₂/year</Text>
              </View>
              <View style={[styles.resultStat, styles.resultStatMid]}>
                <Text style={[styles.resultValue, { color: colors.forest700 }]}>
                  ${(mid * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.resultKey}>Est. income</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={styles.resultValue}>
                  ${(high * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.resultKey}>Max / yr</Text>
              </View>
            </View>
            <Pressable style={styles.ctaButton} onPress={() => router.push("/project/new")}>
              <Text style={styles.ctaText}>Register My Project →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyResult}>
            <Text style={styles.emptyResultText}>
              Enter your {cfg.unitLabel.toLowerCase()} above to see estimated earnings
            </Text>
          </View>
        )}

        <Text style={styles.disclaimer}>
          Estimates are indicative only, based on published ranges per practice type. Actual credits depend on independent field verification, satellite analysis, and project-specific conditions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: colors.line },
  back: { width: 60 },
  backText: { color: colors.forest700, fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1, marginBottom: 8 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: "#fff" },
  typeChipActive: { backgroundColor: colors.forest50, borderColor: colors.forest600 },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: 12, color: colors.body, fontWeight: "500", maxWidth: 90 },
  typeLabelActive: { color: colors.forest700, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.line },
  cardLabel: { fontSize: 13, fontWeight: "600", color: colors.body, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  pricePicker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  priceValue: { fontSize: 16, color: colors.ink, fontWeight: "600" },
  priceDropdown: { marginTop: 4, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" },
  priceOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  priceOptionActive: { backgroundColor: colors.forest50 },
  priceOptionText: { fontSize: 15, color: colors.ink },
  result: { backgroundColor: colors.forest50, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#bbf7d0" },
  resultTitle: { fontSize: 13, fontWeight: "700", color: colors.forest800, marginBottom: 12, textAlign: "center" },
  resultRow: { flexDirection: "row", justifyContent: "space-between" },
  resultStat: { flex: 1, alignItems: "center" },
  resultStatMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#bbf7d0" },
  resultValue: { fontSize: 18, fontWeight: "900", color: colors.ink },
  resultKey: { fontSize: 11, color: colors.forest700, marginTop: 2 },
  ctaButton: { marginTop: 14, backgroundColor: colors.forest600, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyResult: { backgroundColor: "#f9fafb", borderRadius: 16, padding: 20, marginTop: 16, borderWidth: 1, borderColor: colors.line, alignItems: "center" },
  emptyResultText: { color: colors.muted, fontSize: 14, textAlign: "center" },
  disclaimer: { marginTop: 16, fontSize: 11, color: colors.faint, lineHeight: 16, textAlign: "center" },
});
