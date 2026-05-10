import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Permission caméra requise pour scanner les QR codes.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Autoriser la caméra</Text>
        </Pressable>
      </View>
    );
  }

  function handleScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    // Le QR peut contenir soit:
    //   - une URL : https://inspections.exemple.com/machine/EXC-001
    //   - le code seul : EXC-001
    let code = data.trim();
    const match = code.match(/\/machine\/([^/?#]+)/);
    if (match) code = match[1];

    router.replace(`/machine/${encodeURIComponent(code)}`);
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Pointer la caméra vers le QR de la machine</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { fontSize: 16, textAlign: "center", marginBottom: 16 },
  btn: { backgroundColor: "#0f172a", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: "white", fontWeight: "600" },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 8,
  },
  overlayText: { color: "white", textAlign: "center" },
});
