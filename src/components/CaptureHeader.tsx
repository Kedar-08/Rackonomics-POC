import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { buttonStyle, buttonTextStyle } from "../utils/styleHelpers";
import { retryAllPending } from "../services/QueueManager";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import * as Network from "expo-network";
import type { AuthUser } from "../types";

interface Props {
  user: AuthUser | null;
  onLogout: () => Promise<void>;
  onCapture: () => Promise<void>;
  onPick: () => Promise<void>;
  onSync?: () => Promise<void>;
  onSettings?: () => void;
  onDebug?: () => void;
  onPermissionCheck?: () => void;
  isSyncing?: boolean;
}

export default function CaptureHeader({
  user,
  onLogout,
  onCapture,
  onPick,
  onSync,
  onSettings,
  onDebug,
  onPermissionCheck,
  isSyncing,
}: Props) {
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = useCallback(async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await onLogout();
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout");
          }
        },
        style: "destructive",
      },
    ]);
  }, [onLogout]);

  const handleManualSync = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      console.log(
        "🔄 [Manual Sync] Starting manual sync of all pending items..."
      );
      await retryAllPending();
      console.log("✅ [Manual Sync] Completed");
      Alert.alert("✅ Sync Started", "All pending photos are being uploaded");
    } catch (error) {
      console.error("❌ [Manual Sync] Error:", error);
      Alert.alert("Error", "Failed to start sync. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const handleRetryAll = useCallback(async () => {
    try {
      await retryAllPending();
      Alert.alert("Success", "Retrying all pending uploads");
    } catch (error) {
      Alert.alert("Error", "Failed to retry pending uploads");
    }
  }, []);

  const handleNetworkStatusPress = useCallback(async () => {
    setRefreshing(true);
    try {
      const state = await Network.getNetworkStateAsync();
      console.log("🔍 Manual network check:", state);
      Alert.alert(
        "Network Status",
        `Connected: ${state.isConnected}\nType: ${state.type || "unknown"}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to check network status");
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View>
      {/* Network Status Indicator - Tap to refresh */}
      <TouchableOpacity
        style={[
          styles.networkStatusBar,
          { backgroundColor: isOnline ? "#d4edda" : "#f8d7da" },
        ]}
        onPress={handleNetworkStatusPress}
        disabled={refreshing}
      >
        <Text
          style={[
            styles.networkStatusText,
            { color: isOnline ? "#155724" : "#721c24" },
          ]}
        >
          {isOnline === null
            ? "🔍 Checking..."
            : isOnline
              ? "🌐 ONLINE"
              : "📴 OFFLINE"}{" "}
          {refreshing && "⟳"}
        </Text>
      </TouchableOpacity>

      {/* Header with user info and logout */}
      <View style={styles.headerContainer}>
        <View style={styles.userInfoContainer}>
          <Text style={styles.userGreeting}>👤 {user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userRole}>Site Auditor</Text>
        </View>
        <View style={styles.headerButtons}>
          {onSettings && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onSettings}
            >
              <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity>
          )}
          {onDebug && (
            <TouchableOpacity style={styles.debugButton} onPress={onDebug}>
              <Text style={styles.debugButtonText}>🔍</Text>
            </TouchableOpacity>
          )}
          {onPermissionCheck && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={onPermissionCheck}
            >
              <Text style={styles.debugButtonText}>🔐</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync and Photo Buttons */}
      <View style={styles.buttonRow}>
        {/* Manual Sync All Button */}
        <TouchableOpacity
          style={[
            buttonStyle("#4caf50"),
            { flex: 1 },
            refreshing && { opacity: 0.5 },
          ]}
          onPress={handleManualSync}
          disabled={refreshing}
        >
          <Text style={buttonTextStyle()}>
            {refreshing ? "⟳ Syncing..." : "🔄 Sync All"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            buttonStyle("#007AFF", 30, 12),
            { minWidth: 140, alignItems: "center" },
          ]}
          onPress={onCapture}
        >
          <Text style={buttonTextStyle()}>📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            buttonStyle("#007AFF", 30, 12),
            { minWidth: 140, alignItems: "center" },
          ]}
          onPress={onPick}
        >
          <Text style={buttonTextStyle()}>🖼️ Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Button */}
      {onSync && (
        <View style={styles.syncButtonRow}>
          <TouchableOpacity
            style={[
              buttonStyle(isSyncing ? "#4CAF50" : "#2196F3", 30, 12),
              { flex: 1, alignItems: "center" },
            ]}
            onPress={onSync}
            disabled={isSyncing}
          >
            <Text style={buttonTextStyle()}>
              {isSyncing ? "⟳ Syncing..." : "🔄 Sync"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              buttonStyle("#FF9800", 30, 12),
              { flex: 1, alignItems: "center", marginLeft: 8 },
            ]}
            onPress={handleRetryAll}
          >
            <Text style={buttonTextStyle()}>🔁 Retry All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  networkStatusBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  networkStatusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  userInfoContainer: {
    flex: 1,
  },
  userGreeting: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: "500",
    color: "#007AFF",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 12,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsButtonText: {
    fontSize: 20,
  },
  debugButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  debugButtonText: {
    fontSize: 20,
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#fff",
  },
  syncButtonRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
});
