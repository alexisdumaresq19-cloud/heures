import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert("Champs requis", "Email et mot de passe.");
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      Alert.alert("Champ requis", "Nom complet.");
      return;
    }

    setBusy(true);
    const result = mode === "login"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, fullName.trim());
    setBusy(false);

    if (result.error) {
      Alert.alert("Erreur", result.error);
    } else if (mode === "signup") {
      Alert.alert("Compte créé", "Vérifiez vos courriels si la confirmation est activée, sinon connectez-vous.");
      setMode("login");
    }
    // Sur succès de login, AuthProvider met à jour la session et _layout fait le redirect.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inspections QR</Text>
      <Text style={styles.subtitle}>{mode === "login" ? "Connexion" : "Créer un compte"}</Text>

      {mode === "signup" && (
        <>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Jean Tremblay" />
        </>
      )}

      <Text style={styles.label}>Courriel</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="vous@exemple.com"
      />

      <Text style={styles.label}>Mot de passe</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

      <Pressable style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="white" /> : (
          <Text style={styles.btnText}>{mode === "login" ? "Se connecter" : "Créer le compte"}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")}>
        <Text style={styles.toggle}>
          {mode === "login" ? "Pas encore de compte? Créer un compte" : "Déjà inscrit? Se connecter"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", color: "#0f172a" },
  subtitle: { fontSize: 16, textAlign: "center", color: "#64748b", marginBottom: 32 },
  label: { fontWeight: "600", marginTop: 12, marginBottom: 4, color: "#334155" },
  input: { backgroundColor: "white", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  btn: { backgroundColor: "#0f172a", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 24 },
  btnText: { color: "white", fontSize: 16, fontWeight: "600" },
  toggle: { textAlign: "center", color: "#0ea5e9", marginTop: 16 },
});
