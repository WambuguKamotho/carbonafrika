import { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { api, ApiError, getAccessToken } from "@/lib/api";
import { API_URL, colors } from "@/lib/config";

type ProjectType = "LAND_RESTORATION" | "CLEAN_ENERGY";

interface Methodology {
  code: string; name: string; category: string; bufferPercent: number;
}

const LAND_TYPES = ["FOREST", "SAVANNA", "GRASSLAND", "FARMLAND", "WETLAND", "MANGROVE"] as const;
const ENERGY_TYPES = ["BIOGAS", "SOLAR_PV", "BIOCHARCOAL", "COOKSTOVES", "MICRO_HYDRO", "WIND"] as const;
const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function NewProject() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [projectType, setProjectType] = useState<ProjectType>("LAND_RESTORATION");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subType, setSubType] = useState<string>("");        // landType or energyType
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hectares, setHectares] = useState("");
  const [estimatedTons, setEstimatedTons] = useState("");
  const [methodologyCode, setMethodologyCode] = useState("");
  const [photos, setPhotos] = useState<{ uri: string; ipfs: string }[]>([]);

  const [methodologies, setMethodologies] = useState<Methodology[]>([]);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load methodologies once.
  useEffect(() => {
    api.get<Methodology[]>("/api/projects/methodologies")
      .then(setMethodologies)
      .catch(() => {});
  }, []);

  // Auto-locate on mount (best effort — user can still type the country).
  useEffect(() => { locate(); }, []);

  // Reset sub-type + methodology when the project category changes.
  useEffect(() => { setSubType(""); setMethodologyCode(""); }, [projectType]);

  async function locate() {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocating(false); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const place = places[0];
        if (place?.country) setCountry(place.country);
        if (place?.region) setRegion(place.region);
      } catch { /* reverse geocode optional */ }
    } catch {
      setError("Couldn't get your location. You can still set the country manually.");
    } finally {
      setLocating(false);
    }
  }

  async function uploadAsset(asset: ImagePicker.ImagePickerAsset) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      // React Native FormData file shape
      form.append("file", {
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
      const token = await getAccessToken();
      const r = await fetch(`${API_URL}/api/ipfs/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const d = (await r.json()) as { hash?: string; error?: string };
      if (!r.ok || !d.hash) throw new Error(d.error || "Upload failed");
      setPhotos(prev => [...prev, { uri: asset.uri, ipfs: d.hash! }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function addFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError("Photo-library permission denied."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) await uploadAsset(res.assets[0]);
  }

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setError("Camera permission denied."); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) await uploadAsset(res.assets[0]);
  }

  const expectedCategory = projectType === "LAND_RESTORATION" ? "Land Restoration" : "Clean Energy";
  const methodologyChoices = methodologies.filter(m => m.category === expectedCategory);
  const subTypeChoices = projectType === "LAND_RESTORATION" ? LAND_TYPES : ENERGY_TYPES;

  function validate(): string | null {
    if (title.trim().length < 5) return "Title must be at least 5 characters.";
    if (description.trim().length < 20) return "Description must be at least 20 characters.";
    if (!subType) return `Choose a ${projectType === "LAND_RESTORATION" ? "land" : "energy"} type.`;
    if (!country.trim()) return "Country is required (tap “Use my location” or type it).";
    if (!coords) return "Location is required — tap “Use my location”.";
    if (!(parseFloat(hectares) > 0)) return "Enter the area in hectares.";
    if (!(parseFloat(estimatedTons) > 0)) return "Enter the estimated annual tonnes CO₂e.";
    if (!methodologyCode) return "Select a methodology.";
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true);
    setError(null);
    try {
      const base = {
        projectType,
        title: title.trim(),
        description: description.trim(),
        country: country.trim(),
        region: region.trim() || undefined,
        lat: coords!.lat,
        lng: coords!.lng,
        hectares: parseFloat(hectares),
        estimatedTons: parseFloat(estimatedTons),
        methodologyCode,
        ...(photos.length ? { mediaUrls: photos.map(p => p.ipfs) } : {}),
      };
      const payload = projectType === "LAND_RESTORATION"
        ? { ...base, landType: subType }
        : { ...base, energyType: subType };
      const created = await api.post<{ id: string }>("/api/projects", payload);
      router.replace(`/project/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't submit the project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹ Back</Text></Pressable>
        <Text style={styles.topTitle}>New project</Text>
        <View style={{ width: 48 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          {/* Project type */}
          <Text style={styles.label}>Project type</Text>
          <View style={styles.segment}>
            {(["LAND_RESTORATION", "CLEAN_ENERGY"] as ProjectType[]).map(t => (
              <Pressable key={t} onPress={() => setProjectType(t)}
                style={[styles.segmentBtn, projectType === t && styles.segmentBtnActive]}>
                <Text style={[styles.segmentText, projectType === t && styles.segmentTextActive]}>
                  {t === "LAND_RESTORATION" ? "Land Restoration" : "Clean Energy"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Location */}
          <Text style={[styles.label, { marginTop: 18 }]}>Location</Text>
          <Pressable style={styles.locateBtn} onPress={locate} disabled={locating}>
            {locating ? <ActivityIndicator color={colors.forest700} /> : (
              <Text style={styles.locateText}>📍 {coords ? "Update my location" : "Use my location"}</Text>
            )}
          </Pressable>
          {coords && (
            <Text style={styles.coords}>
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}{country ? ` · ${country}` : ""}
            </Text>
          )}

          <Field label="Country" value={country} onChangeText={setCountry} placeholder="e.g. Kenya" />
          <Field label="Region (optional)" value={region} onChangeText={setRegion} placeholder="e.g. Kajiado" />

          {/* Title + description */}
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Kajiado Grassland Restoration" />
          <Field label="Description" value={description} onChangeText={setDescription} multiline
            placeholder="What are you restoring/operating, and the community impact (min 20 chars)" />

          {/* Sub type */}
          <Text style={[styles.label, { marginTop: 16 }]}>{projectType === "LAND_RESTORATION" ? "Land type" : "Energy type"}</Text>
          <View style={styles.chipWrap}>
            {subTypeChoices.map(t => (
              <Pressable key={t} onPress={() => setSubType(t)} style={[styles.chip, subType === t && styles.chipActive]}>
                <Text style={[styles.chipText, subType === t && styles.chipTextActive]}>{label(t)}</Text>
              </Pressable>
            ))}
          </View>

          {/* Numbers */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Area (ha)" value={hectares} onChangeText={setHectares} keyboardType="numeric" placeholder="0" /></View>
            <View style={{ flex: 1 }}><Field label="Est. t CO₂e / yr" value={estimatedTons} onChangeText={setEstimatedTons} keyboardType="numeric" placeholder="0" /></View>
          </View>

          {/* Photos */}
          <Text style={[styles.label, { marginTop: 16 }]}>Photos <Text style={{ color: colors.faint, fontWeight: "400" }}>(optional)</Text></Text>
          <View style={styles.photoRow}>
            {photos.map((p, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
                <Pressable style={styles.thumbX} onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>
                  <Text style={styles.thumbXText}>×</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addPhoto} onPress={addFromLibrary} disabled={uploading}>
              {uploading ? <ActivityIndicator color={colors.forest700} /> : <Text style={styles.addPhotoText}>＋</Text>}
            </Pressable>
            <Pressable style={styles.addPhoto} onPress={addFromCamera} disabled={uploading}>
              <Text style={styles.addPhotoText}>📷</Text>
            </Pressable>
          </View>

          {/* Methodology */}
          <Text style={[styles.label, { marginTop: 16 }]}>Methodology</Text>
          {methodologyChoices.length === 0 ? (
            <Text style={styles.hint}>Loading methodologies…</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {methodologyChoices.map(m => (
                <Pressable key={m.code} onPress={() => setMethodologyCode(m.code)}
                  style={[styles.method, methodologyCode === m.code && styles.methodActive]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodName}>{m.name}</Text>
                    <Text style={styles.methodMeta}>{m.code} · {m.bufferPercent}% buffer</Text>
                  </View>
                  {methodologyCode === m.code && <Text style={styles.methodCheck}>✓</Text>}
                </Pressable>
              ))}
            </View>
          )}

          <Pressable style={[styles.submit, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for review</Text>}
          </Pressable>
          <Text style={styles.note}>Your project is submitted as Pending. Kabon reviews it before it moves to verification.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label: l, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{l}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        style={[styles.input, multiline && { height: 92, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { fontSize: 16, color: colors.forest700, fontWeight: "600", width: 48 },
  topTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  label: { fontSize: 13, fontWeight: "600", color: colors.body, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink, backgroundColor: colors.white },
  segment: { flexDirection: "row", backgroundColor: "#e5e7eb", borderRadius: 12, padding: 3 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segmentBtnActive: { backgroundColor: colors.white },
  segmentText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  segmentTextActive: { color: colors.forest700 },
  locateBtn: { borderWidth: 1, borderColor: colors.forest600, borderRadius: 12, paddingVertical: 11, alignItems: "center", backgroundColor: colors.forest50 },
  locateText: { color: colors.forest700, fontWeight: "700", fontSize: 14 },
  coords: { fontSize: 12, color: colors.muted, marginTop: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white },
  chipActive: { borderColor: colors.forest600, backgroundColor: colors.forest50 },
  chipText: { fontSize: 13, color: colors.body, fontWeight: "600" },
  chipTextActive: { color: colors.forest700 },
  method: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, backgroundColor: colors.white },
  methodActive: { borderColor: colors.forest600, backgroundColor: colors.forest50 },
  methodName: { fontSize: 14, fontWeight: "700", color: colors.ink },
  methodMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  methodCheck: { color: colors.forest700, fontSize: 18, fontWeight: "900" },
  hint: { fontSize: 13, color: colors.faint },
  submit: { backgroundColor: colors.forest600, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  note: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 12, lineHeight: 18 },
  errorBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: "#b91c1c", fontSize: 13 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbWrap: { position: "relative" },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.line },
  thumbX: { position: "absolute", top: -6, right: -6, backgroundColor: colors.ink, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  thumbXText: { color: "#fff", fontSize: 15, fontWeight: "700", lineHeight: 18 },
  addPhoto: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: colors.forest600, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: colors.forest50 },
  addPhotoText: { color: colors.forest700, fontSize: 26, fontWeight: "300" },
});

