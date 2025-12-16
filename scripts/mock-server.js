#!/usr/bin/env node

/**
 * Mock Server for Local Development
 * Simulates backend API for testing photo uploads without real backend
 *
 * Usage:
 *   node scripts/mock-server.js
 *
 * Then set REACT_APP_API_BASE_URL=http://localhost:3000/api (or device IP)
 * and REACT_APP_USE_MOCK=false in your environment
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = "/api";

// Store uploaded files metadata and persist uploads to disk for local development
const uploadedAssets = [];
let assetIdCounter = 1000;

// Uploads directory
const UPLOAD_DIR = path.resolve(__dirname, "uploads");
const UPLOAD_INDEX = path.join(UPLOAD_DIR, "index.json");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Load persisted index if present
try {
  if (fs.existsSync(UPLOAD_INDEX)) {
    const raw = fs.readFileSync(UPLOAD_INDEX, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((p) => uploadedAssets.push(p));
      // Keep assetIdCounter ahead of existing items
      const maxId = parsed.reduce((m, it) => {
        const match = String(it.serverId || "").match(/srv_(\d+)_/);
        if (match) return Math.max(m, parseInt(match[1], 10));
        return m;
      }, 1000);
      assetIdCounter = Math.max(assetIdCounter, maxId + 1);
    }
  }
} catch (err) {
  console.warn("⚠️ [MockServer] Failed to load upload index:", err.message);
}

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

/**
 * POST /api/assets/upload
 * Upload a photo
 */
app.post(`${API_PREFIX}/assets/upload`, upload.single("file"), (req, res) => {
  console.log(`📥 [Upload] Received file: ${req.body.filename}`);

  const {
    filename,
    mimeType,
    timestamp,
    latitude,
    longitude,
    userId,
    username,
    photoCategory,
  } = req.body;

  // Validate required fields
  if (!filename || !mimeType) {
    console.log(`❌ [Upload] Missing required fields`);
    return res.status(400).json({
      status: "error",
      code: "INVALID_REQUEST",
      message: "Missing filename or mimeType",
    });
  }

  // Simulate processing delay
  setTimeout(() => {
    const serverId = `srv_${assetIdCounter++}_${Date.now()}`;

    // Persist file to disk if provided
    let savedFilename = null;
    if (req.file && req.file.buffer) {
      // sanitize original filename
      const safeName = (filename || "file").replace(/[^a-z0-9_.-]/gi, "_");
      savedFilename = `${serverId}_${Date.now()}_${safeName}`;
      const dest = path.join(UPLOAD_DIR, savedFilename);
      try {
        fs.writeFileSync(dest, req.file.buffer);
      } catch (err) {
        console.error("❌ [Upload] Failed to write file to disk:", err.message);
      }
    }

    const asset = {
      serverId,
      filename,
      mimeType,
      timestamp: parseInt(timestamp) || Date.now(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      userId: userId ? parseInt(userId) : null,
      username: username || null,
      photoCategory: photoCategory || "Site",
      uploadedAt: new Date().toISOString(),
      fileSize: req.file ? req.file.size : 0,
      savedFilename,
      url: savedFilename ? `/uploads/${savedFilename}` : null,
    };

    uploadedAssets.push(asset);

    // Persist index file
    try {
      fs.writeFileSync(
        UPLOAD_INDEX,
        JSON.stringify(uploadedAssets, null, 2),
        "utf8"
      );
    } catch (err) {
      console.warn(
        "⚠️ [MockServer] Failed to persist index.json:",
        err.message
      );
    }

    console.log(`✅ [Upload] Asset saved: ${serverId}`);

    res.status(200).json({
      status: "ok",
      serverId,
      url: asset.url,
    });
  }, 500); // 500ms delay to simulate network
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: process.uptime(),
  });
});

/**
 * GET /api/assets
 * List all uploaded assets (admin endpoint)
 */
app.get(`${API_PREFIX}/assets`, (req, res) => {
  res.status(200).json({
    status: "ok",
    count: uploadedAssets.length,
    assets: uploadedAssets,
  });
});

/**
 * GET /api/assets/:serverId
 * Get asset details by server ID
 */
app.get(`${API_PREFIX}/assets/:serverId`, (req, res) => {
  const asset = uploadedAssets.find((a) => a.serverId === req.params.serverId);
  if (!asset) {
    return res.status(404).json({
      status: "error",
      code: "NOT_FOUND",
      message: "Asset not found",
    });
  }
  res.status(200).json({
    status: "ok",
    asset,
  });
});

/**
 * DELETE /api/assets/:serverId
 * Delete asset (admin endpoint)
 */
app.delete(`${API_PREFIX}/assets/:serverId`, (req, res) => {
  const idx = uploadedAssets.findIndex(
    (a) => a.serverId === req.params.serverId
  );
  if (idx === -1) {
    return res.status(404).json({
      status: "error",
      code: "NOT_FOUND",
      message: "Asset not found",
    });
  }
  uploadedAssets.splice(idx, 1);
  res.status(200).json({
    status: "ok",
    message: "Asset deleted",
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error(`❌ [Error]`, err.message);
  res.status(500).json({
    status: "error",
    code: "SERVER_ERROR",
    message: err.message,
  });
});

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOAD_DIR));

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log(`\n📝 Endpoints:`);
  console.log(`   POST   ${API_PREFIX}/assets/upload  - Upload a photo`);
  console.log(`   GET    ${API_PREFIX}/health        - Health check`);
  console.log(
    `   GET    ${API_PREFIX}/assets        - List all assets (admin)`
  );
  console.log(
    `   GET    ${API_PREFIX}/assets/:id    - Get asset details (admin)`
  );
  console.log(`   DELETE ${API_PREFIX}/assets/:id    - Delete asset (admin)`);
  console.log(`\n💡 For development, use:`);
  console.log(
    `   REACT_APP_API_BASE_URL=http://localhost:${PORT}${API_PREFIX}`
  );
  console.log(`   REACT_APP_USE_MOCK=false`);
  console.log(`\n📱 For device/emulator on same network, use your PC IP:`);
  console.log(
    `   REACT_APP_API_BASE_URL=http://192.168.x.x:${PORT}${API_PREFIX}`
  );
  console.log(`\n🏃 Android emulator shortcut to host machine:`);
  console.log(
    `   REACT_APP_API_BASE_URL=http://10.0.2.2:${PORT}${API_PREFIX}\n`
  );
});
