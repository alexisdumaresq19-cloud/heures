import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth";
import { onNetworkChange } from "@/lib/network";
import { syncOutbox } from "@/lib/outbox";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}

function RootStack() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastSyncedOnline = useRef(false);

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!session && !onLogin) {
      router.replace("/login");
    } else if (session && onLogin) {
      router.replace("/");
    }
  }, [session, loading, segments]);

  // Auto-sync de l'outbox: au foreground, et au retour du réseau.
  useEffect(() => {
    if (!session) return;

    const tryFlush = () => { syncOutbox().catch(() => {}); };

    // Au foreground
    const appSub = AppState.addEventListener("change", state => {
      if (state === "active") tryFlush();
    });

    // Au retour du réseau (transition offline→online)
    const netSub = onNetworkChange(online => {
      if (online && !lastSyncedOnline.current) tryFlush();
      lastSyncedOnline.current = online;
    });

    // Tentative initiale
    tryFlush();

    return () => {
      appSub.remove();
      netSub();
    };
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: "Inspections QR" }} />
      <Stack.Screen name="scan" options={{ title: "Scanner un QR" }} />
      <Stack.Screen name="machine/[code]" options={{ title: "Machine" }} />
      <Stack.Screen name="inspection/new" options={{ title: "Nouvelle inspection" }} />
      <Stack.Screen name="inspection/[id]" options={{ title: "Inspection" }} />
      <Stack.Screen name="pending" options={{ title: "En attente d'envoi" }} />
    </Stack>
  );
}
