import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import * as Network from "expo-network";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import CaptureScreen from "./src/screens/CaptureScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { retryAllPending } from "./src/services/QueueManager";

function AppContent() {
  const { isSignedIn, isLoading } = useAuth();

  // Listen for network reconnect and retry pending uploads
  useEffect(() => {
    if (!isSignedIn) return; // Skip if not signed in

    let isMounted = true;
    let wasOnline: boolean | null = null; // Start as null to detect first state
    let checkCount = 0;
    let lastLogTime = 0;
    let firstCheckDone = false;

    const checkNetwork = async () => {
      try {
        let state;
        try {
          state = await Network.getNetworkStateAsync();
        } catch (networkError) {
          const errorMsg = String(networkError);
          // Handle permission denied gracefully
          if (
            errorMsg.includes("Unable to access network information") ||
            errorMsg.includes("Permission denied")
          ) {
            // Permission not granted - assume offline and don't keep retrying
            if (!firstCheckDone) {
              console.log(
                "📡 [App Init] ⚠️ Permission denied - cannot access network information"
              );
              console.log(
                "📡 [App Init] Please grant 'Access Network Information' permission in app settings"
              );
              wasOnline = false;
              firstCheckDone = true;
            }
            return;
          }

          const now = Date.now();
          if (now - lastLogTime > 5000) {
            console.error(
              "❌ [App] Network.getNetworkStateAsync() failed:",
              networkError
            );
            lastLogTime = now;
          }
          // If first check fails for other reasons, just assume offline and continue
          if (!firstCheckDone) {
            console.log("📡 [App Init] Assuming OFFLINE (network unavailable)");
            wasOnline = false;
            firstCheckDone = true;
          }
          return;
        }

        checkCount++;
        const now = Date.now();

        if (!isMounted) return;

        // Only log on first check or state changes (not every check)
        // Removed frequent logging to improve performance

        // On first check, just initialize the state
        if (wasOnline === null) {
          const msg = `[App Init] Network state: ${state.isConnected ? "ONLINE" : "OFFLINE"}`;
          console.log(`📡 ${msg}`);
          wasOnline = state.isConnected ?? false;
          firstCheckDone = true;
          return;
        }

        // Detect transition from offline to online
        if (!wasOnline && (state.isConnected ?? false)) {
          const msg =
            "[App] NETWORK RECONNECTED - Retrying all pending uploads";
          console.log(`🌐 ${msg}`);
          wasOnline = true;
          // NO DELAY - retry immediately
          if (!isMounted) return;
          try {
            console.log("🔄 [App] About to call retryAllPending()");
            await retryAllPending();
            console.log("✅ [App] Retry completed");
          } catch (err) {
            console.error("❌ [App] Error retrying pending uploads:", err);
          }
        } else if (wasOnline && !(state.isConnected ?? false)) {
          const msg = "[App] Network disconnected";
          console.log(`📴 ${msg}`);
          wasOnline = false;
        }
      } catch (error) {
        console.error("❌ [App checkNetwork] Unexpected error:", error);
      }
    };

    // Start checking after a small delay to allow the app to initialize
    const initialDelay = setTimeout(() => {
      void checkNetwork();
    }, 500);

    // Check network state every 2 seconds (balanced between responsiveness and performance)
    const interval = setInterval(checkNetwork, 2000);

    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isSignedIn]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CaptureScreen />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
