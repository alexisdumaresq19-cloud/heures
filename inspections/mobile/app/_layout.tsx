import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth";

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

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!session && !onLogin) {
      router.replace("/login");
    } else if (session && onLogin) {
      router.replace("/");
    }
  }, [session, loading, segments]);

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
    </Stack>
  );
}
