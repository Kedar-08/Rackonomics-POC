import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import * as Network from "expo-network";

export default function PermissionCheckScreen() {
  const [networkStatus, setNetworkStatus] = useState<string>("Checking...");
  const [networkType, setNetworkType] = useState<string>("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkPermission = useCallback(async () => {
    setChecking(true);
    try {
      const state = await Network.getNetworkStateAsync();
      setNetworkStatus(`Connected: ${state.isConnected}`);
      setNetworkType(`Type: ${state.type}`);
      setHasPermission(true);
      Alert.alert(
        "✅ Success",
        `Network Status: ${state.isConnected ? "ONLINE" : "OFFLINE"}\nType: ${state.type}`
      );
    } catch (error) {
      const errorMsg = String(error);
      setNetworkStatus("Permission Denied");
      setNetworkType(errorMsg);
      setHasPermission(false);
      Alert.alert("❌ Permission Error", errorMsg);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📡 Network Permission Check</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Permission Status:</Text>
        <Text
          style={[
            styles.status,
            {
              color:
                hasPermission === true
                  ? "#28a745"
                  : hasPermission === false
                    ? "#dc3545"
                    : "#6c757d",
            },
          ]}
        >
          {hasPermission === true
            ? "✅ GRANTED"
            : hasPermission === false
              ? "❌ DENIED"
              : "🔄 CHECKING"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Network Status:</Text>
        <Text style={styles.value}>{networkStatus}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Details:</Text>
        <Text style={styles.value}>{networkType}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, checking && styles.buttonDisabled]}
        onPress={checkPermission}
        disabled={checking}
      >
        <Text style={styles.buttonText}>
          {checking ? "🔄 Checking..." : "🔄 Check Again"}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ How to fix if denied:</Text>
        <Text style={styles.infoText}>
          1. Go to Settings → Apps → [App Name]
        </Text>
        <Text style={styles.infoText}>2. Tap "Permissions"</Text>
        <Text style={styles.infoText}>
          3. Find "Network" or "Access Network Information"
        </Text>
        <Text style={styles.infoText}>4. Set to "Allow"</Text>
        <Text style={styles.infoText}>
          5. Come back here and tap "Check Again"
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  status: {
    fontSize: 18,
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 16,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: "#e7f3ff",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0056b3",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#0056b3",
    marginBottom: 4,
    lineHeight: 18,
  },
});
