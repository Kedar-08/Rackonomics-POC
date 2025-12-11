import React, { useCallback, useState } from "react";
import { View, FlatList, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { LocalAssetRecord, PhotoCategory } from "../types";
import { useAuth } from "../context/AuthContext";
import { processAndQueueImage } from "../utils/imageHelpers";
import { deleteAsset } from "../db/db";
import AssetItem from "../components/AssetItem";
import ZoomModal from "../components/ZoomModal";
import CameraModal from "../components/CameraModal";
import CaptureHeader from "../components/CaptureHeader";
import CategoryPicker from "../components/CategoryPicker";
import { useAssets } from "../hooks/useAssets";
import DebugScreen from "./DebugScreen";
import PermissionCheckScreen from "./PermissionCheckScreen";

export default function CaptureScreen() {
  const { logout, user } = useAuth();
  const { items, syncingIds, failedIds, refreshing, onRefresh, handleRetry } =
    useAssets(user); // Simplified for AUDITOR-only

  const [showCamera, setShowCamera] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showPermissionCheck, setShowPermissionCheck] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LocalAssetRecord | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] =
    useState<PhotoCategory>("Site");
  const [filterCategory, setFilterCategory] = useState<PhotoCategory | null>(
    null
  );

  const formatDate = (timestampMs: number) => {
    const date = new Date(timestampMs);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePickerResult = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;

      try {
        await processAndQueueImage(
          uri,
          user,
          async () => {
            await onRefresh();
          },
          selectedCategory
        );
        console.log("✅ Photo captured and queued");
      } catch (error) {
        console.error("❌ Error processing image:", error);
        Alert.alert(
          "Upload Error",
          `Failed to process photo: ${error instanceof Error ? error.message : String(error)}`,
          [{ text: "OK" }]
        );
      }
    },
    [onRefresh, user, selectedCategory]
  );

  const handleCapture = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();

      if (!perm.granted) {
        console.log("❌ Camera permission denied");
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera permission in your device settings to take photos.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        allowsEditing: false,
      });

      await handlePickerResult(result);
    } catch (error) {
      console.error("❌ [Camera] Error:", error);
      Alert.alert(
        "Camera Error",
        `Failed to open camera: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: "OK" }]
      );
    }
  }, [handlePickerResult]);

  const handlePick = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    await handlePickerResult(result);
  }, [handlePickerResult]);

  const handleDelete = useCallback(
    async (id: number, filename: string) => {
      Alert.alert(
        "Delete Photo",
        `Are you sure you want to delete ${filename}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteAsset(id);
                await onRefresh();
              } catch (error) {
                console.error("Error deleting asset:", error);
                Alert.alert("Error", "Failed to delete photo");
              }
            },
          },
        ]
      );
    },
    [onRefresh]
  );

  const handleCameraCapture = useCallback(
    async (cameraRef: any) => {
      try {
        const photo = await cameraRef.takePictureAsync({ quality: 0.5 });
        if (photo?.uri) {
          await processAndQueueImage(
            photo.uri,
            user,
            async () => {
              await onRefresh();
            },
            selectedCategory
          );
        }
      } catch (err: any) {
        console.warn("takePictureAsync error", err);
      }
    },
    [onRefresh, user, selectedCategory]
  );

  const handleOpenDebug = useCallback(() => {
    setShowDebug(true);
  }, []);

  const handleCloseDebug = useCallback(() => {
    setShowDebug(false);
  }, []);

  const handleOpenPermissionCheck = useCallback(() => {
    setShowPermissionCheck(true);
  }, []);

  const handleClosePermissionCheck = useCallback(() => {
    setShowPermissionCheck(false);
  }, []);

  if (showDebug) {
    return (
      <View style={styles.container}>
        <DebugScreen />
      </View>
    );
  }

  if (showPermissionCheck) {
    return (
      <View style={styles.container}>
        <PermissionCheckScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CaptureHeader
        user={user}
        onLogout={logout}
        onCapture={handleCapture}
        onPick={handlePick}
        onDebug={handleOpenDebug}
        onPermissionCheck={handleOpenPermissionCheck}
      />

      <CategoryPicker
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        filterCategory={filterCategory}
        onFilterCategory={setFilterCategory}
      />

      <FlatList
        data={(() => {
          // Filter to current auditor's photos only
          let filtered = items.filter(
            (item) =>
              item.userId === parseInt(user?.id || "0", 10) ||
              item.username === user?.username
          );
          // Then apply category filter if selected
          if (filterCategory) {
            filtered = filtered.filter(
              (item) => item.photoCategory === filterCategory
            );
          }
          return filtered;
        })()}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => {
          const isSyncing = syncingIds.has(item.id);
          const isFailed = failedIds.has(item.id);
          return (
            <AssetItem
              item={item}
              isSyncing={isSyncing}
              isFailed={isFailed}
              onZoom={(it) => {
                setSelectedImage(it);
                setShowZoom(true);
              }}
              onRetry={handleRetry}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          );
        }}
      />

      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      <ZoomModal
        visible={showZoom}
        image={selectedImage}
        onClose={() => setShowZoom(false)}
        formatDate={formatDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
