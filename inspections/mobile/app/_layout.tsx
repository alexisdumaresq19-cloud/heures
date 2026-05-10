import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Inspections QR" }} />
        <Stack.Screen name="scan" options={{ title: "Scanner un QR" }} />
        <Stack.Screen name="machine/[code]" options={{ title: "Machine" }} />
        <Stack.Screen name="inspection/new" options={{ title: "Nouvelle inspection" }} />
        <Stack.Screen name="inspection/[id]" options={{ title: "Inspection" }} />
      </Stack>
    </>
  );
}
