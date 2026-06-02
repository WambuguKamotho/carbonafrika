import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/config";

// Entry gate: wait for the token bootstrap, then route by role. Project Owners
// (LANDOWNER) are the v1 audience; everyone else is sent to login for now.
export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role === "LANDOWNER") {
      router.replace("/dashboard");
    } else {
      // Other roles aren't in the mobile app v1 — bounce to login with a note.
      router.replace("/login?unsupported=1");
    }
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.forest900 }}>
      <ActivityIndicator color="#fff" size="large" />
    </View>
  );
}
