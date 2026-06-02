import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { registerNotificationResponseHandler } from "@/lib/push";

export default function RootLayout() {
  const router = useRouter();

  // Route to the relevant screen when a push notification is tapped.
  useEffect(() => {
    let unsub = () => {};
    registerNotificationResponseHandler((data) => {
      const projectId = typeof data?.projectId === "string" ? data.projectId : null;
      if (projectId) router.push(`/project/${projectId}`);
      else router.push("/dashboard");
    }).then((u) => { unsub = u; });
    return () => unsub();
  }, [router]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
