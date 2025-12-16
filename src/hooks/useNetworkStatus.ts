import { useState, useEffect } from "react";
import * as Network from "expo-network";
import { NETWORK_CONFIG } from "../config";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(0);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let count = 0;
    let lastLogTime = 0;
    let firstCheckDone = false;

    const checkStatus = async () => {
      try {
        let state;
        try {
          // Force a fresh check by calling getNetworkStateAsync
          state = await Network.getNetworkStateAsync();
        } catch (error) {
          const errorMsg = String(error);
          // Handle permission denied gracefully
          if (
            errorMsg.includes("Unable to access network information") ||
            errorMsg.includes("Permission denied")
          ) {
            // Permission not granted - assume offline and don't retry
            if (!firstCheckDone) {
              console.log(
                "🔍 [useNetworkStatus] ⚠️ Permission denied - cannot access network information"
              );
              setIsOnline(false);
              firstCheckDone = true;
            }
            return;
          }

          // For other errors (e.g., device offline), update state to offline
          const now = Date.now();
          if (now - lastLogTime > 30000 || !firstCheckDone) {
            console.log(
              "🔍 [useNetworkStatus] Network check failed, assuming OFFLINE"
            );
            lastLogTime = now;
          }
          if (isMounted) {
            setIsOnline(false);
            setLastCheck(now);
            firstCheckDone = true;
          }
          return;
        }

        count++;

        if (isMounted) {
          // Only log first check or every 30 seconds to reduce spam
          const now = Date.now();
          if (now - lastLogTime > 30000 || count === 1) {
            console.log(
              `🔍 [useNetworkStatus] ${state.isConnected ? "ONLINE" : "OFFLINE"}`
            );
            lastLogTime = now;
          }

          setIsOnline(state.isConnected ?? false);
          setLastCheck(now);
          setCheckCount(count);
          firstCheckDone = true;
        }
      } catch (error) {
        console.error("❌ [useNetworkStatus] Unexpected error:", error);
      }
    };

    // Immediate event listener for reactive updates (fires on network changes)
    let subscription: any = null;
    try {
      // Check if addNetworkStateListener exists before calling
      if (typeof (Network as any).addNetworkStateListener === "function") {
        subscription = (Network as any).addNetworkStateListener(
          (state: any) => {
            try {
              if (!isMounted) return;
              const now = Date.now();
              console.log(
                `🔔 [useNetworkStatus] listener: ${state.isConnected ? "ONLINE" : "OFFLINE"}`
              );
              setIsOnline(state.isConnected ?? false);
              setLastCheck(now);
              setCheckCount((c) => c + 1);
              firstCheckDone = true;
            } catch (err) {
              // swallow listener errors
            }
          }
        );
      }
    } catch (err) {
      // If listener not supported or fails, fall back to polling
      console.warn(
        "⚠️ [useNetworkStatus] Listener install failed, falling back to polling",
        err
      );
    }

    // Start polling after a small delay to allow app to initialize
    const initialDelay = setTimeout(() => {
      void checkStatus();
    }, 250);

    // Check at configured interval (fallback when listener isn't available)
    const intervalMs = NETWORK_CONFIG.pollIntervalMs ?? 2000;
    const interval = setInterval(checkStatus, Math.max(500, intervalMs));

    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
      clearInterval(interval);
      try {
        if (subscription && typeof subscription.remove === "function") {
          subscription.remove();
        }
      } catch (err) {
        // ignore
      }
    };
  }, []);

  return { isOnline, lastCheck, checkCount };
}
