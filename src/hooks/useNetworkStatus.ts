import { useState, useEffect } from "react";
import * as Network from "expo-network";

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

          // For other errors, assume offline and continue
          if (!firstCheckDone) {
            console.log(
              "🔍 [useNetworkStatus] Assuming OFFLINE (network unavailable)"
            );
            setIsOnline(false);
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

    // Start checking after a small delay to allow app to initialize
    const initialDelay = setTimeout(() => {
      void checkStatus();
    }, 500);

    // Check every 2 seconds (balanced performance vs responsiveness)
    const interval = setInterval(checkStatus, 2000);

    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, lastCheck, checkCount };
}
