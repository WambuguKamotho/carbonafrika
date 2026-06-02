import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

// Remote push was removed from Expo Go in SDK 53, and importing expo-notifications
// there throws. So we detect Expo Go and no-op, and only *dynamically* import the
// module in a real build (dev-client / standalone). Everything here is best-effort.
const isExpoGo = Constants.executionEnvironment === "storeClient";

let currentToken: string | null = null;

export async function registerForPush(): Promise<string | null> {
  if (isExpoGo) {
    console.log("[push] Skipped in Expo Go — use a development build for push notifications.");
    return null;
  }
  try {
    // Dynamic import: never evaluated under Expo Go, so its side-effects don't run there.
    const Notifications = await import("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } })?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId || projectId.startsWith("00000000")) {
      console.warn("[push] No EAS projectId configured (run `eas init`). Skipping token registration.");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
    await api.post("/api/auth/me/push-token", { token });
    return token;
  } catch (e) {
    console.warn("[push] registration failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

// Wire "tap a notification → navigate" (foreground/background + cold start).
// Returns an unsubscribe fn. No-ops in Expo Go (push isn't supported there).
export async function registerNotificationResponseHandler(
  onTap: (data: Record<string, unknown>) => void,
): Promise<() => void> {
  if (isExpoGo) return () => {};
  try {
    const Notifications = await import("expo-notifications");
    // Cold start: app opened by tapping a notification.
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last?.notification?.request?.content?.data) {
      onTap(last.notification.request.content.data as Record<string, unknown>);
    }
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      onTap(resp.notification.request.content.data as Record<string, unknown>);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

// Best-effort de-registration on sign-out (no expo-notifications import needed).
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try { await api.post("/api/auth/me/push-token/remove", { token: currentToken }); } catch { /* ignore */ }
  currentToken = null;
}
