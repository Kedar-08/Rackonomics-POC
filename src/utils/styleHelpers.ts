/**
 * Common style utilities to reduce duplication across screens
 */
import { StyleSheet } from "react-native";

/**
 * Common button style with given background color
 */
export const buttonStyle = (
  backgroundColor: string,
  paddingHorizontal: number = 12,
  paddingVertical: number = 6
) => ({
  marginTop: 8,
  backgroundColor,
  paddingHorizontal,
  paddingVertical,
  borderRadius: 4,
  alignSelf: "flex-start" as const,
});

/**
 * Common button text style
 */
export const buttonTextStyle = () => ({
  color: "#fff",
  fontSize: 12,
  fontWeight: "600" as const,
});

/**
 * Create a common small text style
 */
export const smallTextStyle = (color: string = "#999") => ({
  fontSize: 12,
  color,
});

/**
 * Create a modal style
 */
export const modalStyles = () =>
  StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.95)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },
  });

/**
 * Asset preview modal styles
 */
export const assetPreviewStyles = () =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    content: {
      width: "90%",
      maxHeight: "90%",
      backgroundColor: "#fff",
      borderRadius: 8,
      overflow: "hidden",
    },
    image: { width: "100%", height: 400 },
    info: { padding: 16, backgroundColor: "#f5f5f5" },
    title: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 8 },
    meta: { fontSize: 12, color: "#666", marginBottom: 4 },
    noImage: { color: "#999", padding: 40, textAlign: "center" },
  });

/**
 * Common auth screen (Login/Signup) styles
 */
export const authScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardAvoid: {
    flex: 1,
  },
  formContainer: {
    width: "100%",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "#f44336",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    color: "#f44336",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
  togglePasswordText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 12,
  },
  authButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#999",
    fontSize: 14,
  },
  authLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  authLinkText: {
    color: "#666",
    fontSize: 14,
  },
  authLinkButton: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  linkDisabled: {
    opacity: 0.5,
  },
});
