import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import Incident from "../models/incident.model.js";
import User from "../models/user.models.js";
import Resource from "../models/resource.model.js";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Calculate trust score based on user verification & data type
 * Uses $geoWithin with $centerSphere to avoid $near/$geoNear restrictions
 */
const calcTrustScore = async (
  userId,
  hasImage = false,
  latitude = null,
  longitude = null,
) => {
  let score = 0;

  if (userId) {
    try {
      const u = await User.findById(userId).select("role phone").lean();
      if (u?.role === "citizen") score += 20;
      if (u?.phone) score += 10;
    } catch (err) {
      console.error("calcTrustScore user lookup error:", err?.message || err);
    }
  } else {
    score += 5;
  }

  if (hasImage) score += 20;

  if (
    typeof latitude !== "undefined" &&
    typeof longitude !== "undefined" &&
    latitude !== null &&
    longitude !== null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude))
  ) {
    try {
      // radius in meters
      const radiusMeters = 5000; // 5 km
      const earthRadiusMeters = 6378137;
      const radiusInRadians = radiusMeters / earthRadiusMeters;

      const nearbyCount = await Incident.countDocuments({
        location: {
          $geoWithin: {
            $centerSphere: [
              [Number(longitude), Number(latitude)],
              radiusInRadians,
            ],
          },
        },
      });

      if (nearbyCount > 0) score += Math.min(30, nearbyCount * 5);
    } catch (err) {
      console.error("calcTrustScore nearby check error:", err?.message || err);
    }
  }

  return Math.min(score, 100);
};

/**
 * Call local Ollama-like generate endpoint (optional helper).
 */
const analyzeWithOllama = async (
  prompt,
  model = "qwen3-coder:480b-cloud",
  options = {},
) => {
  try {
    const payload = { model, prompt, stream: false };
    if (
      options.images &&
      Array.isArray(options.images) &&
      options.images.length > 0
    ) {
      payload.images = options.images;
    }
    const resp = await axios.post(
      "http://localhost:11434/api/generate",
      payload,
      { timeout: 90000 }
    );
    return resp?.data?.response?.trim() || "";
  } catch (err) {
    console.error("analyzeWithOllama error:", err?.message || err);
    return "";
  }
};

/**
 * Create Incident - supports multipart file (req.file) OR base64 (req.body.imageBase64)
 * Stores original multilingual transcript and translatedTranscript (English) for VOICE mode.
 */
export const createIncident = async (req, res) => {
  try {
    const {
      mode,
      type,
      description,
      transcript, // multilingual raw text from frontend
      imageBase64,
      latitude,
      longitude,
      severity,
      language,
    } = req.body;

    // Console log incoming voice transcript & language for debugging
    if (mode === "VOICE") {
      console.log("createIncident - incoming VOICE payload:", {
        transcript: transcript || "<empty>",
        language: language || "<unknown>",
        latitude,
        longitude,
        reportedBy: req.userId || "<unauthenticated>",
      });
    }

    if (!req.userId)
      return res
        .status(401)
        .json({ message: "Authentication required to report incidents" });

    if (!mode || !["VOICE", "IMAGE_TEXT"].includes(mode)) {
      return res
        .status(400)
        .json({ message: "mode must be either VOICE or IMAGE_TEXT" });
    }

    if (typeof latitude === "undefined" || typeof longitude === "undefined") {
      return res
        .status(400)
        .json({ message: "latitude and longitude are required" });
    }

    if (mode === "VOICE" && !transcript) {
      return res
        .status(400)
        .json({ message: "transcript is required for VOICE mode" });
    }

    if (mode === "IMAGE_TEXT" && !imageBase64 && !req.file) {
      return res
        .status(400)
        .json({
          message: "image file or imageBase64 is required for IMAGE_TEXT mode",
        });
    }

    let imageUrl;
    let analysisText = "";
    let resolvedType = type;
    let translatedTranscript = "";

    // IMAGE_TEXT: support uploaded file (req.file) or base64
    if (mode === "IMAGE_TEXT") {
      let cleanedBase64 = "";
      if (req.file) {
        const fileBuffer = await fs.promises.readFile(req.file.path);
        cleanedBase64 = fileBuffer.toString("base64");
        await fs.promises.unlink(req.file.path).catch(() => {});
      } else {
        cleanedBase64 = (imageBase64 || "").replace(/^data:.*;base64,/, "");
      }

      const dataUri = `data:image/jpeg;base64,${cleanedBase64}`;
      try {
        const upload = await cloudinary.uploader.upload(dataUri, {
          folder: "crisis_connect/incidents",
        });
        imageUrl = upload.secure_url;
      } catch (err) {
        console.error("Cloudinary upload failed:", err?.message || err);
        return res.status(500).json({ message: "Failed to upload image" });
      }

      const visionPrompt = `You are a concise vision assistant for crisis reporting.
Analyze the image and return a short plain-text response containing:
- Incident Type (one of: Fire, Flood, Medical, Accident, Infrastructure, Other)
- Severity (Low, Medium, High, Critical)
- One-line summary of visible evidence.`;

      analysisText = await analyzeWithOllama(visionPrompt, "gemma3:4b", {
        images: [cleanedBase64],
      });
    }

    // VOICE: store original transcript, translate, then analyze translated text
    if (mode === "VOICE") {
      const original = transcript;
      const translatePrompt = `Translate the following text to English. Return only the translated text (no extra commentary):\n\n${original}`;
      translatedTranscript = await analyzeWithOllama(
        translatePrompt,
        "qwen3-coder:480b-cloud",
      );

      const textForAnalysis = translatedTranscript?.trim()
        ? translatedTranscript
        : original;

      const textPrompt = `You are a concise text assistant for crisis reporting.
Analyze the following emergency report and return a short plain-text response containing:
- Incident Type (one of: Fire, Flood, Medical, Accident, Infrastructure, Other)
- Severity (Low, Medium, High, Critical)
- One-line summary of key details.

Report: "${textForAnalysis}"`;

      analysisText = await analyzeWithOllama(
        textPrompt,
        "qwen3-coder:480b-cloud",
      );
    }

    // Extract type if not provided
    if (!resolvedType && analysisText) {
      const a = analysisText.toLowerCase();
      if (a.includes("fire")) resolvedType = "Fire";
      else if (a.includes("flood")) resolvedType = "Flood";
      else if (a.includes("medical")) resolvedType = "Medical";
      else if (a.includes("accident")) resolvedType = "Accident";
      else if (a.includes("infrastructure")) resolvedType = "Infrastructure";
      else resolvedType = "Other";
    }

    // Determine severity
    let extractedSeverity = severity || "Medium";
    if (analysisText) {
      const s = analysisText.toLowerCase();
      if (s.includes("critical")) extractedSeverity = "Critical";
      else if (s.includes("high")) extractedSeverity = "High";
      else if (s.includes("medium")) extractedSeverity = "Medium";
      else if (s.includes("low")) extractedSeverity = "Low";
    }

    const trustScore = await calcTrustScore(
      req.userId,
      !!imageUrl,
      Number(latitude),
      Number(longitude),
    );

    const incidentData = {
      type: resolvedType || "Other",
      description:
        description ||
        (mode === "VOICE"
          ? translatedTranscript || transcript
          : analysisText) ||
        "",
      severity: extractedSeverity,
      mode,
      transcript: mode === "VOICE" ? transcript : undefined,
      translatedTranscript:
        mode === "VOICE" ? translatedTranscript || "" : undefined,
      imageUrl: imageUrl || undefined,
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
      reportedBy: req.userId,
      trustScore,
      status: "Pending",
    };

    const incident = new Incident(incidentData);
    await incident.save();
    await incident.populate("reportedBy", "name email phone role");

    return res.status(201).json({
      message: "Incident created successfully",
      incident,
      analysis: analysisText,
    });
  } catch (err) {
    console.error("createIncident error:", err?.message || err);
    return res
      .status(500)
      .json({
        message: "Internal server error",
        error: err?.message || String(err),
      });
  }
};

/* Simple handlers for listing, fetching, updating, deleting incidents */

export const getIncidents = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const incidents = await Incident.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reportedBy", "name email phone role")
      .lean();

    const total = await Incident.countDocuments();

    return res.status(200).json({ incidents, total, page, limit });
  } catch (err) {
    console.error("getIncidents error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const incident = await Incident.findById(incidentId).populate(
      "reportedBy",
      "name email phone role",
    );
    if (!incident)
      return res.status(404).json({ message: "Incident not found" });
    return res.status(200).json({ incident });
  } catch (err) {
    console.error("getIncidentById error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateIncidentStatus = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { status, respondedBy, dispatchedResources } = req.body;
    const incident = await Incident.findById(incidentId);
    if (!incident)
      return res.status(404).json({ message: "Incident not found" });

    if (status) incident.status = status;
    if (respondedBy) incident.respondedBy = respondedBy;
    if (dispatchedResources && Array.isArray(dispatchedResources))
      incident.dispatchedResources = dispatchedResources;

    await incident.save();
    await incident.populate("reportedBy", "name email phone role");

    return res.status(200).json({ message: "Incident updated", incident });
  } catch (err) {
    console.error("updateIncidentStatus error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const markIncidentSpam = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const incident = await Incident.findById(incidentId);
    if (!incident)
      return res.status(404).json({ message: "Incident not found" });
    incident.status = "Spam";
    await incident.save();
    return res.status(200).json({ message: "Marked as spam", incident });
  } catch (err) {
    console.error("markIncidentSpam error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Nearby incidents - returns incidents within a radius (meters)
 * Uses $geoWithin + $centerSphere to avoid $near/$geoNear restrictions
 */
export const getNearbyIncidents = async (req, res) => {
  try {
    const lat = Number(req.params.lat);
    const lon = Number(req.params.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon))
      return res.status(400).json({ message: "Invalid coordinates" });

    const radiusMeters = Number(req.query.radius) || 5000; // default 5km
    const earthRadiusMeters = 6378137;
    const radiusInRadians = radiusMeters / earthRadiusMeters;

    const incidents = await Incident.find({
      location: {
        $geoWithin: {
          $centerSphere: [[lon, lat], radiusInRadians],
        },
      },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("reportedBy", "name email phone role")
      .lean();

    return res.status(200).json({ incidents, count: incidents.length });
  } catch (err) {
    console.error("getNearbyIncidents error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteIncident = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const incident = await Incident.findByIdAndDelete(incidentId);
    if (!incident)
      return res.status(404).json({ message: "Incident not found" });
    return res.status(200).json({ message: "Incident deleted" });
  } catch (err) {
    console.error("deleteIncident error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getIncidentStats = async (req, res) => {
  try {
    const total = await Incident.countDocuments();
    const byStatus = await Incident.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const recent = await Incident.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    return res.status(200).json({ total, byStatus, recent });
  } catch (err) {
    console.error("getIncidentStats error:", err?.message || err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
