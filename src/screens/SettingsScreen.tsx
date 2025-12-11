import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSettings } from "../context/SettingsContext";
import { buttonStyle, buttonTextStyle } from "../utils/styleHelpers";

interface SettingsScreenProps {
  onClose?: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { settings, updateSettings, resetTelemetry, telemetry } = useSettings();

  const handleAutoUploadToggle = useCallback(
    async (value: boolean) => {
      await updateSettings({ autoUploadEnabled: value });
    },
    [updateSettings]
  );

  const handleOnlyWiFiToggle = useCallback(
    async (value: boolean) => {
      await updateSettings({ onlyWiFi: value });
    },
    [updateSettings]
  );

  const handleResetTelemetry = useCallback(() => {
    Alert.alert("Reset Telemetry", "Clear all sync statistics?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await resetTelemetry();
          Alert.alert("Success", "Telemetry cleared");
        },
      },
    ]);
  }, [resetTelemetry]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sync Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Auto-Upload</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingName}>Enable Background Sync</Text>
              <Text style={styles.settingDesc}>
                Allow automatic uploads when app is closed
              </Text>
            </View>
            <Switch
              value={settings.autoUploadEnabled}
              onValueChange={handleAutoUploadToggle}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingName}>Wi-Fi Only</Text>
              <Text style={styles.settingDesc}>
                Only upload photos over Wi-Fi (saves mobile data)
              </Text>
            </View>
            <Switch
              value={settings.onlyWiFi}
              onValueChange={handleOnlyWiFiToggle}
              disabled={!settings.autoUploadEnabled}
            />
          </View>
        </View>

        {/* Telemetry Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Sync Statistics</Text>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Auto-Sync Runs:</Text>
            <Text style={styles.statValue}>{telemetry.autoSyncRuns}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Successful Uploads:</Text>
            <Text style={[styles.statValue, styles.successText]}>
              {telemetry.successfulUploads}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Failed Uploads:</Text>
            <Text style={[styles.statValue, styles.failedText]}>
              {telemetry.failedUploads}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last Sync:</Text>
            <Text style={styles.statValue}>
              {telemetry.lastSyncTime
                ? new Date(telemetry.lastSyncTime).toLocaleString()
                : "Never"}
            </Text>
          </View>

          <TouchableOpacity
            style={buttonStyle("#FF6B6B")}
            onPress={handleResetTelemetry}
          >
            <Text style={buttonTextStyle()}>Clear Statistics</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>

          <Text style={styles.aboutText}>
            This tablet app captures audit photos and automatically syncs them
            to the server when online. You can manually trigger sync anytime
            using the Sync button on the home screen.
          </Text>

          <Text style={styles.aboutText}>
            Photos are stored locally on your device until uploaded. Once
            synced, they are marked with a checkmark.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  closeButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingLabel: {
    flex: 1,
    marginRight: 12,
  },
  settingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: "#999",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  successText: {
    color: "#4CAF50",
  },
  failedText: {
    color: "#F44336",
  },
  aboutText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
  },
});
