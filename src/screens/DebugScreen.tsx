import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  getDeviceLogs,
  clearDeviceLogs,
  formatDeviceLogs,
} from "../utils/deviceLog";
import type { LogEntry } from "../utils/deviceLog";

export default function DebugScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = useCallback(async () => {
    setRefreshing(true);
    try {
      const allLogs = await getDeviceLogs();
      setLogs(allLogs);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleClearLogs = useCallback(async () => {
    Alert.alert("Clear Logs", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        onPress: async () => {
          await clearDeviceLogs();
          setLogs([]);
        },
        style: "destructive",
      },
    ]);
  }, []);

  const formatted = formatDeviceLogs(logs);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Device Logs</Text>
        <Text style={styles.subtitle}>{logs.length} entries</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={loadLogs}
          disabled={refreshing}
        >
          <Text style={styles.buttonText}>
            {refreshing ? "⟳ Loading..." : "🔄 Refresh"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearLogs}
        >
          <Text style={styles.buttonText}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logsContainer}>
        <Text style={styles.logsText}>{formatted || "No logs yet"}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: "#fff",
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: "#007AFF",
  },
  clearButton: {
    backgroundColor: "#ff3b30",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  logsContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  logsText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#333",
    lineHeight: 16,
  },
});
