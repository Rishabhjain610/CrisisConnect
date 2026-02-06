import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import Incident from "../models/incident.model.js";
import User from "../models/user.models.js";
import Resource from "../models/resource.model.js";
import { v2 as cloudinary } from "cloudinary";

import forensicsModule from "../utils/forensics.js";
const { analyzeForensics } = forensicsModule;

import {
  analyzeVision,
  analyzeVoice,
  analyzeSemantics,
} from "../utils/ai-analysis.js";
import { calculateTrustScore } from "../utils/scoring.js";
import { determinePriorityCode } from "../utils/priority-coding.js";
import twilio from "twilio";

const client = process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * ==================== HELPER: AUTO-DETECT INCIDENT TYPE ====================
 */
const detectIncidentType = (visionAnalysis, voiceAnalysis) => {
  const emergencyObjects = (visionAnalysis.emergency_detected || []).map((o) =>
    o.toLowerCase()
  );
  const keywords = (voiceAnalysis.keywords || []).map((k) => k.toLowerCase());
  const allText = [...emergencyObjects, ...keywords].join(" ");

  // FIRE & BURNING
  if (
    emergencyObjects.some((o) =>
      ["fire", "flames", "burning", "smoke"].some((e) => o.includes(e))
    ) ||
    keywords.some((k) => ["fire", "burning", "flames"].some((e) => k.includes(e)))
  ) {
    return "Fire";
  }

  // FLOOD & WATER EMERGENCY
  if (
    emergencyObjects.some((o) =>
      ["flood", "flooding", "water", "submerged", "drowning"].some((e) =>
        o.includes(e)
      )
    ) ||
    keywords.some((k) => ["flood", "water", "drowning"].some((e) => k.includes(e)))
  ) {
    return "Flood";
  }

  // EARTHQUAKE & STRUCTURAL COLLAPSE
  if (
    emergencyObjects.some((o) =>
      ["collapse", "debris", "building", "rubble", "earthquake", "tremor"].some(
        (e) => o.includes(e)
      )
    ) ||
    keywords.some((k) =>
      ["collapse", "earthquake", "tremor", "quake", "rubble"].some((e) =>
        k.includes(e)
      )
    )
  ) {
    return "Earthquake";
  }

  // MEDICAL EMERGENCY
  if (
    emergencyObjects.some((o) =>
      ["blood", "injury", "trauma", "medical", "ambulance"].some((e) =>
        o.includes(e)
      )
    ) ||
    keywords.some((k) =>
      ["injury", "blood", "hurt", "medical", "hospital"].some((e) => k.includes(e))
    )
  ) {
    return "Medical Emergency";
  }

  // TRAFFIC ACCIDENT
  if (
    emergencyObjects.some((o) =>
      ["car", "accident", "crash", "vehicle", "collision"].some((e) =>
        o.includes(e)
      )
    ) ||
    keywords.some((k) =>
      ["accident", "crash", "collision", "vehicle"].some((e) => k.includes(e))
    )
  ) {
    return "Traffic Accident";
  }

  // ARMED INCIDENT
  if (
    emergencyObjects.some((o) =>
      ["weapon", "gun", "knife", "armed", "shooting"].some((e) => o.includes(e))
    ) ||
    keywords.some((k) =>
      ["weapon", "gun", "shooting", "armed"].some((e) => k.includes(e))
    )
  ) {
    return "Armed Incident";
  }

  // TRAPPED PERSON
  if (
    keywords.some((k) =>
      ["trapped", "stuck", "buried", "pinned"].some((e) => k.includes(e))
    )
  ) {
    return "Trapped Person";
  }

  // HAZMAT / CHEMICAL
  if (
    emergencyObjects.some((o) =>
      ["chemical", "toxic", "gas", "hazmat", "pollution"].some((e) =>
        o.includes(e)
      )
    ) ||
    keywords.some((k) =>
      ["chemical", "toxic", "gas", "hazmat"].some((e) => k.includes(e))
    )
  ) {
    return "Hazmat Incident";
  }

  // CROWD DISTURBANCE / RIOT
  if (
    emergencyObjects.some((o) =>
      ["crowd", "riot", "protest", "disturbance"].some((e) => o.includes(e))
    ) ||
    keywords.some((k) =>
      ["riot", "protest", "disturbance", "crowd"].some((e) => k.includes(e))
    )
  ) {
    return "Crowd Disturbance";
  }

  // DEFAULT
  return "Other";
};

/**
 * ==================== MAIN HANDLER: CREATE INCIDENT ====================
 */
export const createIncident = async (req, res) => {
  const verificationLog = [];

  try {
    console.log("\n\n" + "█".repeat(70));
    console.log("█ 🚨 NEW INCIDENT REPORT - 5 PHASE PIPELINE");
    console.log("█".repeat(70));

    const {
      mode,
      type,
      description,
      transcript,
      imageBase64,
      latitude,
      longitude,
      severity,
      language,
    } = req.body;

    // ==================== VALIDATION ====================
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required to report incidents"
      });
    }

    if (!mode || !["VOICE", "IMAGE_TEXT", "SHAKE_HYBRID"].includes(mode)) {
      return res.status(400).json({
        message: "mode must be VOICE, IMAGE_TEXT, or SHAKE_HYBRID",
      });
    }

    if (typeof latitude === "undefined" || typeof longitude === "undefined") {
      return res.status(400).json({
        message: "latitude and longitude are required"
      });
    }

    // Mode-specific validation
    if (mode === "VOICE" && !transcript) {
      return res.status(400).json({
        message: "transcript is required for VOICE mode",
      });
    }

    if (mode === "IMAGE_TEXT" && !imageBase64 && !req.file) {
      return res.status(400).json({
        message: "imageBase64 or image file is required for IMAGE_TEXT mode",
      });
    }

    if (mode === "SHAKE_HYBRID" && !imageBase64 && !req.file) {
      return res.status(400).json({
        message: "imageBase64 or image file is required for SHAKE_HYBRID mode",
      });
    }

    // ==================== PARSE IMAGE FILE ====================
    let imageBuffer = null;
    let cleanImageBase64 = null;

    // From multipart upload (via multer middleware)
    if (req.file) {
      imageBuffer = await fs.promises.readFile(req.file.path);
      cleanImageBase64 = imageBuffer.toString("base64");
      await fs.promises.unlink(req.file.path).catch(() => { });
      console.log("📸 Image from multipart upload");
    }
    // From JSON base64
    else if (imageBase64) {
      const cleaned = (imageBase64 || "").replace(/^data:.*;base64,/, "");
      imageBuffer = Buffer.from(cleaned, "base64");
      cleanImageBase64 = cleaned;
      console.log("📸 Image from base64 payload");
    }

    // ==================== PHASE 1: FORENSICS ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 1: FORENSICS");
    console.log("█".repeat(70));

    let forensics = {
      realismFactor: 1.0,
      isFake: false,
      confidenceScore: 0,
      isPocket: false,
      verdict: "Analysis pending",
    };

    // Only run forensics if image exists
    if (imageBuffer) {
      forensics = await analyzeForensics(imageBuffer, mode, cleanImageBase64);
      verificationLog.push({
        phase: "forensics",
        timestamp: new Date(),
        result: forensics,
      });

      // 🚨 HARD REJECT IF DEEPFAKE
      if (forensics.isFake) {
        console.log("\n🚨 DEEPFAKE DETECTED - REJECTING INCIDENT");
        return res.status(400).json({
          message: "🚨 Image failed authenticity verification",
          details: "This image appears to be AI-generated or manipulated",
          verdict: forensics.verdict,
          forensics: {
            realismFactor: forensics.realismFactor,
            confidenceScore: forensics.confidenceScore,
            indicators: forensics.deepfakeIndicators,
          },
        });
      }
    } else if (mode !== "VOICE") {
      console.log("⚠️ No image provided, skipping forensics");
    }

    // ==================== PHASE 2-3: AI ANALYSIS ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 2-3: AI ANALYSIS");
    console.log("█".repeat(70));

    let visionAnalysis = {
      detected: [],
      emergency_detected: [],
      severity: "Unknown",
      peopleCount: 0,
      confidence: 0,
      isReal: true,
      model: "None",
    };

    let voiceAnalysis = {
      keywords: [],
      sentiment: "neutral",
      urgency: 5,
      confidence: 0,
      model: "None",
    };

    let semantics = { alignmentScore: 50 };

    try {
      const analysisPromises = [];

      // Vision: Only if image exists
      if (imageBuffer && (mode === "IMAGE_TEXT" || mode === "SHAKE_HYBRID")) {
        const base64Image = cleanImageBase64 || imageBuffer.toString("base64");
        analysisPromises.push(
          analyzeVision(base64Image)
            .then((result) => {
              visionAnalysis = result || visionAnalysis;
              console.log("✅ Vision analysis complete");
              console.log(`   Emergency Objects: ${(result?.emergency_detected || []).join(", ") || "None"}`);
              console.log(`   Severity: ${result?.severity || "Unknown"}`);
            })
            .catch((err) => {
              console.error("⚠️ Vision error:", err.message);
            })
        );
      }

      // Voice: Only if transcript exists
      if (transcript && (mode === "VOICE" || mode === "IMAGE_TEXT" || mode === "SHAKE_HYBRID")) {
        analysisPromises.push(
          analyzeVoice(transcript)
            .then((result) => {
              voiceAnalysis = result || voiceAnalysis;
              console.log("✅ Voice analysis complete");
              console.log(`   Keywords: ${(result?.keywords || []).join(", ") || "None"}`);
              console.log(`   Urgency: ${result?.urgency || 5}`);
            })
            .catch((err) => {
              console.error("⚠️ Voice error:", err.message);
            })
        );
      }

      await Promise.all(analysisPromises);

      // Semantic alignment: Only if both exist
      if (imageBuffer && transcript) {
        semantics = analyzeSemantics(visionAnalysis, voiceAnalysis);
        console.log("✅ Semantics analysis complete");
        console.log(`   Alignment Score: ${semantics.alignmentScore}`);
      }

      verificationLog.push({
        phase: "ai_analysis",
        timestamp: new Date(),
        result: { visionAnalysis, voiceAnalysis, semantics },
      });
    } catch (err) {
      console.error("⚠️ AI analysis error:", err.message);
    }

    // ==================== PHASE 4: SCORING ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 4: SCORING");
    console.log("█".repeat(70));

    let trustScoreData = {
      totalScore: 50,
      formula: "UNKNOWN",
      breakdown: {},
      locationConsensus: { score: 0 },
    };

    try {
      trustScoreData = await calculateTrustScore(
        mode,
        forensics,
        visionAnalysis,
        voiceAnalysis,
        semantics,
        Number(latitude),
        Number(longitude)
      );
    } catch (err) {
      console.error("⚠️ Scoring error:", err.message);
    }

    verificationLog.push({
      phase: "scoring",
      timestamp: new Date(),
      result: trustScoreData,
    });

    // ==================== PHASE 5: PRIORITY CODING ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 5: PRIORITY CODING");
    console.log("█".repeat(70));

    let priorityCode = {
      code: "ALPHA",
      description: "Standard incident",
      dispatchLevel: 2,
      autoDispatch: false,
    };

    try {
      priorityCode = await determinePriorityCode(
        trustScoreData,
        forensics,
        voiceAnalysis,
        visionAnalysis,
        trustScoreData.locationConsensus,
        Number(latitude),
        Number(longitude)
      );
    } catch (err) {
      console.error("⚠️ Priority coding error:", err.message);
    }

    verificationLog.push({
      phase: "priority_coding",
      timestamp: new Date(),
      result: priorityCode,
    });

    // ==================== UPLOAD IMAGE TO CLOUDINARY ====================
    let imageUrl = null;

    if (imageBuffer && cleanImageBase64) {
      try {
        const dataUri = `data:image/jpeg;base64,${cleanImageBase64}`;
        const upload = await cloudinary.uploader.upload(dataUri, {
          folder: "crisis_connect/incidents",
          timeout: 60000,
        });
        imageUrl = upload.secure_url;
        console.log("✅ Image uploaded to Cloudinary");
      } catch (err) {
        console.error("⚠️ Image upload error:", err.message);
      }
    }

    // ==================== AUTO-DETECT INCIDENT TYPE ====================
    // ✅ If type not provided or is "Other", auto-detect from AI analysis
    let detectedType = type || "Other";

    if (!type || type === "Other") {
      detectedType = detectIncidentType(visionAnalysis, voiceAnalysis);
      console.log(`\n🔍 AUTO-DETECTED TYPE: ${detectedType}`);
    }

    // ==================== SAVE INCIDENT TO DATABASE ====================
    const incidentData = {
      type: detectedType,
      description: description || transcript || "",
      severity: severity || "Medium",
      mode,
      transcript: transcript || undefined,
      language: language || "en",
      imageUrl,
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
      reportedBy: req.userId,
      forensics,
      aiAnalysis: {
        vision: visionAnalysis,
        voice: voiceAnalysis,
        semantics,
      },
      trustScore: {
        totalScore: trustScoreData.totalScore,
        formula: trustScoreData.formula,
        breakdown: trustScoreData.breakdown,
        locationConsensus: trustScoreData.locationConsensus,
      },
      priorityCode,
      // ✅ ONLY mark as SPAM if deepfake OR priority code is X-RAY
      status: priorityCode.code === "X-RAY" || forensics.isFake ? "Spam" : "Pending",
      verificationLog,
    };

    const incident = new Incident(incidentData);
    await incident.save();
    await incident.populate("reportedBy", "name email phone role");

    console.log("\n✅ INCIDENT CREATED SUCCESSFULLY");
    console.log("█ Priority Code:", priorityCode.code);
    console.log("█ Description:", priorityCode.description);
    console.log("█ Trust Score:", trustScoreData.totalScore.toFixed(0));
    console.log("█ Status:", incidentData.status);
    console.log("█ Type:", incidentData.type);
    console.log("█ Mode:", mode);
    console.log("█".repeat(70) + "\n");

    return res.status(201).json({
      message: "✅ Incident created successfully",
      incident,
      priorityCode,
      trustScore: trustScoreData.totalScore,
    });
  } catch (err) {
    console.error("❌ createIncident error:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : "Server error",
    });
  }
};

// ==================== OTHER ENDPOINTS ====================
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
    console.error("getIncidents error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const incident = await Incident.findById(incidentId).populate(
      "reportedBy",
      "name email phone role"
    );
    if (!incident)
      return res.status(404).json({ message: "Incident not found" });
    return res.status(200).json({ incident });
  } catch (err) {
    console.error("getIncidentById error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateIncidentStatus = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { status, respondedBy, dispatchedResources } = req.body;

    // Find and Update
    const incident = await Incident.findByIdAndUpdate(
      incidentId,
      {
        ...(status && { status }),
        ...(respondedBy && { respondedBy }),
        ...(dispatchedResources && { dispatchedResources })
      },
      { new: true }
    ).populate("reportedBy");

    if (!incident) return res.status(404).json({ message: "Incident not found" });

    // 🔔 NOTIFICATION LOGIC: If Resolved
    if (status === "Resolved" && client && incident.reportedBy?.phone) {
      try {
        await client.messages.create({
          body: `✅ INCIDENT RESOLVED: The emergency report #${incident._id.toString().slice(-4)} has been closed. All units are returning to base. Stay safe!`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: incident.reportedBy.phone
        });
        console.log(`Resolution SMS sent to ${incident.reportedBy.phone}`);
      } catch (e) {
        console.error("Twilio Error:", e.message);
      }
    }

    return res.status(200).json({ message: "Incident updated", incident });
  } catch (err) {
    console.error("updateIncidentStatus error:", err.message);
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
    console.error("markIncidentSpam error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getNearbyIncidents = async (req, res) => {
  try {
    const lat = Number(req.params.lat);
    const lon = Number(req.params.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon))
      return res.status(400).json({ message: "Invalid coordinates" });

    const radiusMeters = Number(req.query.radius) || 5000;
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
    console.error("getNearbyIncidents error:", err.message);
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
    console.error("deleteIncident error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getIncidentStats = async (req, res) => {
  try {
    const total = await Incident.countDocuments();
    const byStatus = await Incident.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byType = await Incident.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);
    const recent = await Incident.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    return res.status(200).json({ total, byStatus, byType, recent });
  } catch (err) {
    console.error("getIncidentStats error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getIncidentAnalytics = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const timezone = req.query.timezone || "UTC";
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const match = { createdAt: { $gte: start, $lte: end } };

    const [
      total,
      resolved,
      active,
      pending,
      spam,
      trendByDay,
      byType,
      bySeverity,
      byStatus,
      byPriority,
      byMode,
      trustBuckets,
      responseBySeverity,
      slaBySeverity,
      hourlyPattern,
      dayOfWeekPattern,
      hotspots,
      recent,
      resourcesByStatus,
      resourcesByCategory,
      usersByRole,
      avgResolutionAgg,
      backlogAging,
      autoDispatchAgg,
    ] = await Promise.all([
      Incident.countDocuments(match),
      Incident.countDocuments({ ...match, status: "Resolved" }),
      Incident.countDocuments({ ...match, status: "Active" }),
      Incident.countDocuments({ ...match, status: "Pending" }),
      Incident.countDocuments({ ...match, status: "Spam" }),
      Incident.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone,
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        { $group: { _id: "$priorityCode.code", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        { $group: { _id: "$mode", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        {
          $bucket: {
            groupBy: "$trustScore.totalScore",
            boundaries: [0, 20, 40, 60, 80, 101],
            default: "unknown",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      Incident.aggregate([
        { $match: { ...match, status: "Resolved" } },
        {
          $project: {
            severity: 1,
            resolutionHours: {
              $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 3600000],
            },
          },
        },
        {
          $group: {
            _id: "$severity",
            avgResolutionHours: { $avg: "$resolutionHours" },
            count: { $sum: 1 },
          },
        },
        { $sort: { avgResolutionHours: -1 } },
      ]),
      Incident.aggregate([
        { $match: { ...match, status: "Resolved" } },
        {
          $project: {
            severity: 1,
            resolutionHours: {
              $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 3600000],
            },
            slaTargetHours: {
              $switch: {
                branches: [
                  { case: { $eq: ["$severity", "Critical"] }, then: 1 },
                  { case: { $eq: ["$severity", "High"] }, then: 2 },
                  { case: { $eq: ["$severity", "Medium"] }, then: 4 },
                  { case: { $eq: ["$severity", "Low"] }, then: 8 },
                ],
                default: 4,
              },
            },
          },
        },
        {
          $project: {
            severity: 1,
            slaMet: { $lte: ["$resolutionHours", "$slaTargetHours"] },
          },
        },
        {
          $group: {
            _id: "$severity",
            total: { $sum: 1 },
            met: { $sum: { $cond: ["$slaMet", 1, 0] } },
          },
        },
      ]),
      Incident.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $hour: { date: "$createdAt", timezone } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dayOfWeek: { date: "$createdAt", timezone } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Incident.aggregate([
        { $match: match },
        {
          $project: {
            lat: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 2] },
            lon: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 2] },
            severityScore: {
              $switch: {
                branches: [
                  { case: { $eq: ["$severity", "Low"] }, then: 1 },
                  { case: { $eq: ["$severity", "Medium"] }, then: 2 },
                  { case: { $eq: ["$severity", "High"] }, then: 3 },
                  { case: { $eq: ["$severity", "Critical"] }, then: 4 },
                ],
                default: 2,
              },
            },
          },
        },
        {
          $group: {
            _id: { lat: "$lat", lon: "$lon" },
            count: { $sum: 1 },
            avgSeverityScore: { $avg: "$severityScore" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Incident.find(match)
        .sort({ createdAt: -1 })
        .limit(6)
        .select("type severity status priorityCode.code createdAt location")
        .lean(),
      Resource.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Resource.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: { ...match, status: "Resolved" } },
        {
          $project: {
            resolutionHours: {
              $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 3600000],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgResolutionHours: { $avg: "$resolutionHours" },
            minResolutionHours: { $min: "$resolutionHours" },
            maxResolutionHours: { $max: "$resolutionHours" },
          },
        },
      ]),
      Incident.aggregate([
        { $match: { status: { $in: ["Pending", "Active"] } } },
        {
          $project: {
            ageHours: {
              $divide: [{ $subtract: [end, "$createdAt"] }, 3600000],
            },
          },
        },
        {
          $bucket: {
            groupBy: "$ageHours",
            boundaries: [0, 1, 6, 24, 72, 168, 100000],
            default: "unknown",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      Incident.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$priorityCode.autoDispatch",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const avgResolution = avgResolutionAgg?.[0] || {
      avgResolutionHours: null,
      minResolutionHours: null,
      maxResolutionHours: null,
    };

    const autoDispatchCount = autoDispatchAgg.reduce(
      (sum, item) => (item._id ? sum + item.count : sum),
      0
    );

    const response = {
      range: {
        days,
        start,
        end,
        timezone,
      },
      summary: {
        total,
        resolved,
        active,
        pending,
        spam,
        resolutionRate: total ? Number(((resolved / total) * 100).toFixed(1)) : 0,
        avgResolutionHours: avgResolution.avgResolutionHours,
        minResolutionHours: avgResolution.minResolutionHours,
        maxResolutionHours: avgResolution.maxResolutionHours,
        autoDispatchRate: total
          ? Number(((autoDispatchCount / total) * 100).toFixed(1))
          : 0,
      },
      trends: trendByDay.map((d) => ({ date: d._id, count: d.count })),
      byType: byType.map((d) => ({ type: d._id || "Unknown", count: d.count })),
      bySeverity: bySeverity.map((d) => ({ severity: d._id || "Unknown", count: d.count })),
      byStatus: byStatus.map((d) => ({ status: d._id || "Unknown", count: d.count })),
      byPriority: byPriority.map((d) => ({ code: d._id || "Unknown", count: d.count })),
      byMode: byMode.map((d) => ({ mode: d._id || "Unknown", count: d.count })),
      trustScoreBuckets: trustBuckets.map((b) => ({
        range:
          b._id === "unknown"
            ? "unknown"
            : `${b._id}-${Number(b._id) + 20}`,
        count: b.count,
      })),
      responseBySeverity: responseBySeverity.map((d) => ({
        severity: d._id || "Unknown",
        avgResolutionHours: d.avgResolutionHours,
        count: d.count,
      })),
      slaBySeverity: slaBySeverity.map((d) => ({
        severity: d._id || "Unknown",
        met: d.met,
        total: d.total,
        rate: d.total ? Number(((d.met / d.total) * 100).toFixed(1)) : 0,
      })),
      hourlyPattern: hourlyPattern.map((d) => ({ hour: d._id, count: d.count })),
      dayOfWeekPattern: dayOfWeekPattern.map((d) => ({ day: d._id, count: d.count })),
      hotspots: hotspots.map((h) => ({
        lat: h._id.lat,
        lon: h._id.lon,
        count: h.count,
        avgSeverityScore: Number(h.avgSeverityScore?.toFixed(2) || 0),
      })),
      backlogAging: backlogAging.map((b) => ({ bucket: b._id, count: b.count })),
      resources: {
        byStatus: resourcesByStatus.map((r) => ({ status: r._id, count: r.count })),
        byCategory: resourcesByCategory.map((r) => ({ category: r._id, count: r.count })),
      },
      users: {
        byRole: usersByRole.map((u) => ({ role: u._id, count: u.count })),
      },
      recent,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("getIncidentAnalytics error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const dispatchIncident = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { resources } = req.body;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    if (incident.status !== "Pending") {
      return res.status(400).json({ message: "Incident already handled" });
    }

    const dispatchedResourceIds = [];

    for (const r of resources || []) {
      const resource = await Resource.findById(r.resourceId);
      if (!resource) continue;

      resource.status = "Reserved";
      resource.current_incident = incidentId;
      resource.quantity = r.quantity;
      await resource.save();

      dispatchedResourceIds.push(resource._id);
    }

    incident.status = "Active";
    incident.dispatchedResources = dispatchedResourceIds;
    incident.respondedBy = req.userId;
    await incident.save();

    return res.status(200).json({
      message: "Resources dispatched successfully",
      incident,
    });
  } catch (error) {
    console.error("Dispatch Incident Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * ==================== DEMO/EXPO HANDLER: CREATE INCIDENT ====================
 * No authentication required - uses x-demo-user header
 */
/**
 * ==================== DEMO/EXPO HANDLER: CREATE INCIDENT ====================
 * No authentication required - uses x-demo-user header
 * Extracts phone from User DB if email exists
 */
export const createIncidentDemo = async (req, res) => {
  const verificationLog = [];

  try {
    console.log("\n\n" + "█".repeat(70));
    console.log("█ 🚨 EXPO DEMO INCIDENT REPORT - 5 PHASE PIPELINE");
    console.log("█".repeat(70));

    // Get demo user email from header
    const demoUserEmail = req.headers['x-demo-user'] || 'demo@crisis-connect.app';
    console.log(`👤 Demo User Email: ${demoUserEmail}`);

    const {
      mode,
      type,
      description,
      transcript,
      imageBase64,
      latitude,
      longitude,
      severity,
      language,
    } = req.body;

    // ==================== VALIDATION ====================
    if (!mode || !["VOICE", "IMAGE_TEXT", "SHAKE_HYBRID"].includes(mode)) {
      return res.status(400).json({
        message: "mode must be VOICE, IMAGE_TEXT, or SHAKE_HYBRID",
      });
    }

    if (typeof latitude === "undefined" || typeof longitude === "undefined") {
      return res.status(400).json({
        message: "latitude and longitude are required"
      });
    }

    // Mode-specific validation
    if (mode === "VOICE" && !transcript) {
      return res.status(400).json({
        message: "transcript is required for VOICE mode",
      });
    }

    if (mode === "IMAGE_TEXT" && !imageBase64 && !req.file) {
      return res.status(400).json({
        message: "imageBase64 or image file is required for IMAGE_TEXT mode",
      });
    }

    if (mode === "SHAKE_HYBRID" && !imageBase64 && !req.file) {
      return res.status(400).json({
        message: "imageBase64 or image file is required for SHAKE_HYBRID mode",
      });
    }

    // ==================== PARSE IMAGE FILE ====================
    let imageBuffer = null;
    let cleanImageBase64 = null;

    // From multipart upload (via multer middleware)
    if (req.file) {
      imageBuffer = await fs.promises.readFile(req.file.path);
      cleanImageBase64 = imageBuffer.toString("base64");
      await fs.promises.unlink(req.file.path).catch(() => { });
      console.log("📸 Image from multipart upload");
    }
    // From JSON base64
    else if (imageBase64) {
      const cleaned = (imageBase64 || "").replace(/^data:.*;base64,/, "");
      imageBuffer = Buffer.from(cleaned, "base64");
      cleanImageBase64 = cleaned;
      console.log("📸 Image from base64 payload");
    }

    // ==================== PHASE 1: FORENSICS ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 1: FORENSICS");
    console.log("█".repeat(70));

    let forensics = {
      realismFactor: 1.0,
      isFake: false,
      confidenceScore: 0,
      isPocket: false,
      verdict: "Analysis pending",
    };

    // Only run forensics if image exists
    if (imageBuffer) {
      forensics = await analyzeForensics(imageBuffer, mode, cleanImageBase64);
      verificationLog.push({
        phase: "forensics",
        timestamp: new Date(),
        result: forensics,
      });

      // 🚨 HARD REJECT IF DEEPFAKE
      if (forensics.isFake) {
        console.log("\n🚨 DEEPFAKE DETECTED - REJECTING INCIDENT");
        return res.status(400).json({
          message: "🚨 Image failed authenticity verification",
          details: "This image appears to be AI-generated or manipulated",
          verdict: forensics.verdict,
          forensics: {
            realismFactor: forensics.realismFactor,
            confidenceScore: forensics.confidenceScore,
            indicators: forensics.deepfakeIndicators,
          },
        });
      }
    } else if (mode !== "VOICE") {
      console.log("⚠️ No image provided, skipping forensics");
    }

    // ==================== PHASE 2-3: AI ANALYSIS ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 2-3: AI ANALYSIS");
    console.log("█".repeat(70));

    let visionAnalysis = {
      detected: [],
      emergency_detected: [],
      severity: "Unknown",
      peopleCount: 0,
      confidence: 0,
      isReal: true,
      model: "None",
    };

    let voiceAnalysis = {
      keywords: [],
      sentiment: "neutral",
      urgency: 5,
      confidence: 0,
      model: "None",
    };

    let semantics = { alignmentScore: 50 };

    try {
      const analysisPromises = [];

      // Vision: Only if image exists
      if (imageBuffer && (mode === "IMAGE_TEXT" || mode === "SHAKE_HYBRID")) {
        const base64Image = cleanImageBase64 || imageBuffer.toString("base64");
        analysisPromises.push(
          analyzeVision(base64Image)
            .then((result) => {
              visionAnalysis = result || visionAnalysis;
              console.log("✅ Vision analysis complete");
              console.log(`   Emergency Objects: ${(result?.emergency_detected || []).join(", ") || "None"}`);
              console.log(`   Severity: ${result?.severity || "Unknown"}`);
            })
            .catch((err) => {
              console.error("⚠️ Vision error:", err.message);
            })
        );
      }

      // Voice: Only if transcript exists
      if (transcript && (mode === "VOICE" || mode === "IMAGE_TEXT" || mode === "SHAKE_HYBRID")) {
        analysisPromises.push(
          analyzeVoice(transcript)
            .then((result) => {
              voiceAnalysis = result || voiceAnalysis;
              console.log("✅ Voice analysis complete");
              console.log(`   Keywords: ${(result?.keywords || []).join(", ") || "None"}`);
              console.log(`   Urgency: ${result?.urgency || 5}`);
            })
            .catch((err) => {
              console.error("⚠️ Voice error:", err.message);
            })
        );
      }

      await Promise.all(analysisPromises);

      // Semantic alignment: Only if both exist
      if (imageBuffer && transcript) {
        semantics = analyzeSemantics(visionAnalysis, voiceAnalysis);
        console.log("✅ Semantics analysis complete");
        console.log(`   Alignment Score: ${semantics.alignmentScore}`);
      }

      verificationLog.push({
        phase: "ai_analysis",
        timestamp: new Date(),
        result: { visionAnalysis, voiceAnalysis, semantics },
      });
    } catch (err) {
      console.error("⚠️ AI analysis error:", err.message);
    }

    // ==================== PHASE 4: SCORING ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 4: SCORING");
    console.log("█".repeat(70));

    let trustScoreData = {
      totalScore: 50,
      formula: "UNKNOWN",
      breakdown: {},
      locationConsensus: { score: 0 },
    };

    try {
      trustScoreData = await calculateTrustScore(
        mode,
        forensics,
        visionAnalysis,
        voiceAnalysis,
        semantics,
        Number(latitude),
        Number(longitude)
      );
    } catch (err) {
      console.error("⚠️ Scoring error:", err.message);
    }

    verificationLog.push({
      phase: "scoring",
      timestamp: new Date(),
      result: trustScoreData,
    });

    // ==================== PHASE 5: PRIORITY CODING ====================
    console.log("\n" + "█".repeat(70));
    console.log("█ PHASE 5: PRIORITY CODING");
    console.log("█".repeat(70));

    let priorityCode = {
      code: "ALPHA",
      description: "Standard incident",
      dispatchLevel: 2,
      autoDispatch: false,
    };

    try {
      priorityCode = await determinePriorityCode(
        trustScoreData,
        forensics,
        voiceAnalysis,
        visionAnalysis,
        trustScoreData.locationConsensus,
        Number(latitude),
        Number(longitude)
      );
    } catch (err) {
      console.error("⚠️ Priority coding error:", err.message);
    }

    verificationLog.push({
      phase: "priority_coding",
      timestamp: new Date(),
      result: priorityCode,
    });

    // ==================== UPLOAD IMAGE TO CLOUDINARY ====================
    let imageUrl = null;

    if (imageBuffer && cleanImageBase64) {
      try {
        const dataUri = `data:image/jpeg;base64,${cleanImageBase64}`;
        const upload = await cloudinary.uploader.upload(dataUri, {
          folder: "crisis_connect/incidents/demo",
          timeout: 60000,
        });
        imageUrl = upload.secure_url;
        console.log("✅ Image uploaded to Cloudinary");
      } catch (err) {
        console.error("⚠️ Image upload error:", err.message);
      }
    }

    // ==================== AUTO-DETECT INCIDENT TYPE ====================
    let detectedType = type || "Other";

    if (!type || type === "Other") {
      detectedType = detectIncidentType(visionAnalysis, voiceAnalysis);
      console.log(`\n🔍 AUTO-DETECTED TYPE: ${detectedType}`);
    }

    // ==================== FIND EXISTING USER BY EMAIL ====================
    // ✅ FIX: Look for user with matching email - if found, use their phone
    let demoUser = await User.findOne({ email: demoUserEmail });
    
    if (!demoUser) {
      // User doesn't exist - create temporary demo user
      demoUser = new User({
        name: "Expo Demo User",
        email: demoUserEmail,
        phone: "+1-DEMO-000", // Placeholder phone
        role: "citizen",
        isDemo: true,
        password: "demo_no_auth",
      });
      await demoUser.save();
      console.log(`✅ Demo user created: ${demoUserEmail}`);
    } else {
      // User exists - use their phone from DB
      console.log(`✅ User found: ${demoUser.email} | Phone: ${demoUser.phone}`);
    }

    // ==================== SAVE INCIDENT TO DATABASE ====================
    const incidentData = {
      type: detectedType,
      description: description || transcript || "",
      severity: severity || "Medium",
      mode,
      transcript: transcript || undefined,
      language: language || "en",
      imageUrl,
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
      reportedBy: demoUser._id,
      forensics,
      aiAnalysis: {
        vision: visionAnalysis,
        voice: voiceAnalysis,
        semantics,
      },
      trustScore: {
        totalScore: trustScoreData.totalScore,
        formula: trustScoreData.formula,
        breakdown: trustScoreData.breakdown,
        locationConsensus: trustScoreData.locationConsensus,
      },
      priorityCode,
      status: priorityCode.code === "X-RAY" || forensics.isFake ? "Spam" : "Pending",
      verificationLog,
    };

    const incident = new Incident(incidentData);
    await incident.save();
    await incident.populate("reportedBy", "name email phone role");

    console.log("\n✅ DEMO INCIDENT CREATED SUCCESSFULLY");
    console.log("█ ID:", incident._id);
    console.log("█ Priority Code:", priorityCode.code);
    console.log("█ Trust Score:", trustScoreData.totalScore.toFixed(0));
    console.log("█ Status:", incidentData.status);
    console.log("█ Type:", incidentData.type);
    console.log("█ Mode:", mode);
    console.log("█ Reporter Email:", demoUserEmail);
    console.log("█ Reporter Phone:", demoUser.phone);
    console.log("█".repeat(70) + "\n");

    return res.status(201).json({
      message: "✅ Demo incident created successfully",
      incident,
      priorityCode,
      trustScore: trustScoreData.totalScore,
      demoUser: {
        id: demoUser._id,
        email: demoUser.email,
        name: demoUser.name,
        phone: demoUser.phone, // ✅ Include phone in response
      },
    });
  } catch (err) {
    console.error("❌ createIncidentDemo error:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : "Server error",
    });
  }
};

// ...existing code...

// ...existing code...

export default {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  markIncidentSpam,
  getNearbyIncidents,
  deleteIncident,
  getIncidentStats,
  getIncidentAnalytics,
  dispatchIncident,
  createIncidentDemo,
};