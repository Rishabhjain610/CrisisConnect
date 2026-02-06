
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
  processTextIntelligence,
  detectImageFormat,
} from "../utils/ai-analysis.js";
import { calculateTrustScore } from "../utils/scoring.js";
import { determinePriorityCode } from "../utils/priority-coding.js";
import twilio from "twilio";

const client =
  process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * ==================== HELPER: DETERMINE SEVERITY FROM TRUST SCORE ====================
 */
const determineSeverityFromTrustScore = (trustScore, visionAnalysis, voiceAnalysis) => {
  console.log(`\n🎯 DETERMINING SEVERITY FROM TRUST SCORE: ${trustScore.toFixed(1)}`);

  // Priority 1: Check emergency objects in vision
  const emergencyObjects = (visionAnalysis.emergency_detected || []).map(o => o.toLowerCase());
  const keywords = (voiceAnalysis.keywords || []).map(k => k.toLowerCase());

  // Check for CRITICAL indicators
  const hasFire = emergencyObjects.some(o =>
    ["fire", "flames", "burning", "smoke"].some(e => o.includes(e))
  ) || keywords.some(k => ["fire", "burning", "flames"].some(e => k.includes(e)));

  const hasBlood = emergencyObjects.some(o =>
    ["blood", "injury", "trauma", "wounded"].some(e => o.includes(e))
  ) || keywords.some(k => ["blood", "injury", "bleeding"].some(e => k.includes(e)));

  const hasCollapse = emergencyObjects.some(o =>
    ["collapse", "debris", "building", "rubble"].some(e => o.includes(e))
  ) || keywords.some(k => ["collapse", "earthquake", "rubble"].some(e => k.includes(e)));

  const hasTrapped = keywords.some(k =>
    ["trapped", "stuck", "buried", "pinned"].some(e => k.includes(e))
  );

  const isDying = keywords.some(k =>
    ["dying", "dead", "not breathing", "unconscious"].some(e => k.includes(e))
  );

  // CRITICAL: High trust score (75+) + critical indicators
  if (trustScore >= 75) {
    if (hasFire || hasCollapse || isDying || hasTrapped) {
      console.log(`   🔴 CRITICAL: High trust (${trustScore.toFixed(1)}) + Critical indicator`);
      return "Critical";
    }
    if (hasBlood) {
      console.log(`   🔴 CRITICAL: High trust (${trustScore.toFixed(1)}) + Blood/Injury detected`);
      return "Critical";
    }
    console.log(`   🔴 CRITICAL: Very high trust score (${trustScore.toFixed(1)})`);
    return "Critical";
  }

  // HIGH: Medium-high trust (50-75) + emergency objects or urgent voice
  if (trustScore >= 50) {
    if (hasFire || hasBlood || hasCollapse) {
      console.log(`   🟠 HIGH: Medium-high trust (${trustScore.toFixed(1)}) + Emergency detected`);
      return "High";
    }
    if (voiceAnalysis.urgency >= 8 || voiceAnalysis.sentiment === "panic") {
      console.log(`   🟠 HIGH: Medium-high trust (${trustScore.toFixed(1)}) + Urgent voice`);
      return "High";
    }
    console.log(`   🟠 HIGH: Medium-high trust score (${trustScore.toFixed(1)})`);
    return "High";
  }

  // MEDIUM: Moderate trust score (30-50)
  if (trustScore >= 30) {
    console.log(`   🟡 MEDIUM: Moderate trust score (${trustScore.toFixed(1)})`);
    return "Medium";
  }

  // LOW: Low trust score (<30)
  console.log(`   🟢 LOW: Low trust score (${trustScore.toFixed(1)})`);
  return "Low";
};

/**
 * ==================== HELPER: AUTO-DETECT INCIDENT TYPE ====================
 */
const detectIncidentType = (visionAnalysis, voiceAnalysis, textIntelligence) => {
  // Priority 1: Text Intelligence type (most reliable)
  if (textIntelligence?.detectedType && textIntelligence.detectedType !== "Other") {
    return textIntelligence.detectedType;
  }

  const emergencyObjects = (visionAnalysis.emergency_detected || []).map(o =>
    o.toLowerCase()
  );
  const keywords = (voiceAnalysis.keywords || []).map(k => k.toLowerCase());

  // FIRE & BURNING
  if (
    emergencyObjects.some((o) =>
      ["fire", "flames", "burning", "smoke"].some((e) => o.includes(e))
    ) ||
    keywords.some((k) =>
      ["fire", "burning", "flames"].some((e) => k.includes(e))
    )
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
    keywords.some((k) =>
      ["flood", "water", "drowning"].some((e) => k.includes(e))
    )
  ) {
    return "Flood";
  }

  // MEDICAL EMERGENCY
  if (
    emergencyObjects.some((o) =>
      ["blood", "injury", "trauma", "medical", "ambulance"].some((e) =>
        o.includes(e)
      )
    ) ||
    keywords.some((k) =>
      ["injury", "blood", "hurt", "medical", "hospital"].some((e) =>
        k.includes(e)
      )
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

  // DEFAULT
  return "Other";
};

/**
 * ==================== AUTHENTICATED ROUTE: CREATE INCIDENT ====================
 */
export const createIncident = async (req, res) => {
  const verificationLog = [];
  const startTime = Date.now();

  try {
    console.log("\n\n" + "█".repeat(80));
    console.log("█ 🚨 NEW INCIDENT REPORT (AUTHENTICATED)");
    console.log("█ USING OLLAMA PIPELINE");
    console.log("█".repeat(80));

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

    console.log(`📱 Mode: ${mode}`);
    console.log(`📍 Location: ${latitude}, ${longitude}`);
    console.log(`👤 User ID: ${req.userId}`);

    // ==================== VALIDATION ====================
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required to report incidents",
      });
    }

    if (!mode || !["VOICE", "IMAGE_TEXT", "SHAKE_HYBRID"].includes(mode)) {
      return res.status(400).json({
        message: "mode must be VOICE, IMAGE_TEXT, or SHAKE_HYBRID",
      });
    }

    if (typeof latitude === "undefined" || typeof longitude === "undefined") {
      return res.status(400).json({
        message: "latitude and longitude are required",
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
    let imageFormat = null;

    if (req.file) {
      imageBuffer = await fs.promises.readFile(req.file.path);
      cleanImageBase64 = imageBuffer.toString("base64");
      imageFormat = detectImageFormat(cleanImageBase64);
      await fs.promises.unlink(req.file.path).catch(() => { });
      console.log("📸 Image from multipart upload");
      if (imageFormat?.warning) console.log(`   ${imageFormat.warning}`);
    } else if (imageBase64) {
      const cleaned = (imageBase64 || "").replace(/^data:.*;base64,/, "");
      imageBuffer = Buffer.from(cleaned, "base64");
      cleanImageBase64 = cleaned;
      imageFormat = detectImageFormat(cleanImageBase64);
      console.log("📸 Image from base64 payload");
      if (imageFormat?.warning) console.log(`   ${imageFormat.warning}`);
    }

    // ==================== PHASE 1: TEXT INTELLIGENCE ====================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 1: TEXT INTELLIGENCE (OLLAMA)");
    console.log("=".repeat(60));

    const inputText = description || transcript || "";
    let textIntelligence = {
      translatedText: inputText,
      detectedType: "Other",
    };

    try {
      if (inputText.trim()) {
        textIntelligence = await processTextIntelligence(inputText);
        verificationLog.push({
          phase: "text_intelligence",
          timestamp: new Date(),
          result: textIntelligence,
        });
      }
    } catch (err) {
      console.error("⚠️ Text Intelligence Error:", err.message);
    }

    // ==================== PHASE 2: FORENSICS ANALYSIS ====================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 2: FORENSICS ANALYSIS");
    console.log("=".repeat(60));

    let forensics = {
      realismFactor: 1.0,
      isFake: false,
      confidenceScore: 0,
      isPocket: false,
      verdict: "Analysis pending",
    };

    if (imageBuffer) {
      try {
        forensics = await analyzeForensics(imageBuffer, mode, cleanImageBase64);
        verificationLog.push({
          phase: "forensics",
          timestamp: new Date(),
          result: forensics,
        });

        if (forensics.isFake && forensics.confidenceScore > 90) {
          console.log("\n🚨 HIGH CONFIDENCE DEEPFAKE DETECTED");
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
      } catch (err) {
        console.error("⚠️ Forensics error:", err.message);
      }
    } else if (mode !== "VOICE") {
      console.log("⚠️ No image provided, skipping forensics");
    }

    // ==================== PHASE 3: AI ANALYSIS ====================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 3: AI ANALYSIS");
    console.log("=".repeat(60));

    let visionAnalysis = {
      detected: [],
      emergency_detected: [],
      severity: "Medium",
      people_count: 0,
      confidence: 0,
      isReal: true,
      imageFormat: imageFormat || { type: "UNKNOWN", maxTrustScore: 50 },
      model: "None",
    };

    let voiceAnalysis = {
      keywords: [],
      sentiment: "neutral",
      urgency: 5,
      confidence: 0,
      model: "None",
    };

    let semantics = { alignmentScore: 40 };

    try {
      const analysisPromises = [];

      if (imageBuffer && (mode === "IMAGE_TEXT" || mode === "SHAKE_HYBRID")) {
        const base64Image = cleanImageBase64 || imageBuffer.toString("base64");
        analysisPromises.push(
          analyzeVision(base64Image)
            .then((result) => {
              if (result && !result.error) {
                visionAnalysis = { ...visionAnalysis, ...result };
                console.log("✅ Vision analysis complete");
                console.log(
                  `   Emergency Objects: ${(result?.emergency_detected || []).join(", ") || "None"}`
                );
                console.log(`   Severity: ${result?.severity || "Medium"}`);
              }
            })
            .catch((err) => {
              console.error("⚠️ Vision error:", err.message);
            })
        );
      }

      if (
        transcript &&
        (mode === "VOICE" || mode === "IMAGE_TEXT" || mode === "SHAKE_HYBRID")
      ) {
        analysisPromises.push(
          analyzeVoice(transcript)
            .then((result) => {
              if (result && !result.error) {
                voiceAnalysis = { ...voiceAnalysis, ...result };
                console.log("✅ Voice analysis complete");
                console.log(
                  `   Keywords: ${(result?.keywords || []).join(", ") || "None"}`
                );
                console.log(`   Urgency: ${result?.urgency || 5}`);
              }
            })
            .catch((err) => {
              console.error("⚠️ Voice error:", err.message);
            })
        );
      }

      await Promise.allSettled(analysisPromises);

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
      console.error("⚠️ AI analysis pipeline error:", err.message);
    }

    // ==================== PHASE 4: TRUST SCORING ====================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 4: TRUST SCORING");
    console.log("=".repeat(60));

    let trustScoreData = {
      totalScore: 50,
      formula: "UNKNOWN",
      breakdown: {},
      locationConsensus: { score: 0 },
      imageFormat: imageFormat,
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
      trustScoreData.imageFormat = imageFormat;
    } catch (err) {
      console.error("⚠️ Scoring error:", err.message);
    }

    verificationLog.push({
      phase: "scoring",
      timestamp: new Date(),
      result: trustScoreData,
    });

    // ==================== PHASE 5: PRIORITY CODING ====================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 5: PRIORITY CODING");
    console.log("=".repeat(60));

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
    let detectedType = type || textIntelligence.detectedType;

    if (!type || type === "Other") {
      detectedType = detectIncidentType(
        visionAnalysis,
        voiceAnalysis,
        textIntelligence
      );
      console.log(`\n🔍 AUTO-DETECTED TYPE: ${detectedType}`);
    }

    // ==================== DETERMINE SEVERITY FROM TRUST SCORE ====================
    console.log("\n" + "=".repeat(60));
    console.log("DETERMINING SEVERITY FROM TRUST SCORE");
    console.log("=".repeat(60));

    const determinedSeverity = determineSeverityFromTrustScore(
      trustScoreData.totalScore,
      visionAnalysis,
      voiceAnalysis
    );

    console.log(`   Final Severity: ${determinedSeverity}`);

    // ==================== SAVE TO DATABASE ====================
    console.log("\n" + "=".repeat(60));
    console.log("PHASE 6: SAVING TO DATABASE");
    console.log("=".repeat(60));

    const incidentData = {
      type: detectedType,
      description: textIntelligence.translatedText || description || transcript || "",
      severity: determinedSeverity,
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
        textIntelligence,
      },
      trustScore: {
        totalScore: trustScoreData.totalScore,
        formula: trustScoreData.formula,
        breakdown: trustScoreData.breakdown,
        locationConsensus: trustScoreData.locationConsensus,
        imageFormat: imageFormat,
      },
      priorityCode,
      status: priorityCode.code === "X-RAY" || forensics.isFake ? "Spam" : "Pending",
      verificationLog,
    };

    const incident = new Incident(incidentData);
    await incident.save();
    await incident.populate("reportedBy", "name email phone role");

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ INCIDENT SAVED SUCCESSFULLY");
    console.log(`📊 Processing Time: ${processingTime}s`);
    console.log(`🆔 Incident ID: ${incident._id}`);
    console.log(`📞 Priority: ${priorityCode.code}`);
    console.log(`📊 Trust Score: ${trustScoreData.totalScore.toFixed(1)}`);
    console.log(`🔴 Severity: ${determinedSeverity}`);
    if (imageFormat?.isPNG)
      console.log(`🔴 IMAGE: PNG (Score capped below 30)`);
    console.log(`📋 Status: ${incidentData.status}`);
    console.log(`🏷️ Type: ${incidentData.type}`);
    console.log("█".repeat(80) + "\n");

    return res.status(201).json({
      success: true,
      message: "✅ Incident created successfully",
      incident,
      priorityCode,
      trustScore: trustScoreData.totalScore,
      severity: determinedSeverity,
      textIntelligence,
      processingTime: `${processingTime}s`,
    });
  } catch (err) {
    console.error("❌ createIncident error:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Server error",
    });
  }
};

/**
 * ==================== DEMO/EXPO ROUTE: NO OLLAMA, TRUST SCORE < 20 ====================
 */
export const createIncidentDemo = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("\n\n" + "█".repeat(80));
    console.log("█ 🚨 DEMO INCIDENT REPORT (NO OLLAMA)");
    console.log("█ TRUST SCORE WILL BE CAPPED BELOW 20");
    console.log("█".repeat(80));

    const demoUserEmail = req.headers["x-demo-user"] || "demo@crisis-connect.app";
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

    console.log(`📱 Mode: ${mode}`);
    console.log(`📍 Location: ${latitude}, ${longitude}`);

    // ==================== VALIDATION ====================
    if (!mode || !["VOICE", "IMAGE_TEXT", "SHAKE_HYBRID"].includes(mode)) {
      return res.status(400).json({
        message: "mode must be VOICE, IMAGE_TEXT, or SHAKE_HYBRID",
      });
    }

    if (typeof latitude === "undefined" || typeof longitude === "undefined") {
      return res.status(400).json({
        message: "latitude and longitude are required",
      });
    }

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
    let imageFormat = null;

    if (req.file) {
      imageBuffer = await fs.promises.readFile(req.file.path);
      cleanImageBase64 = imageBuffer.toString("base64");
      imageFormat = detectImageFormat(cleanImageBase64);
      await fs.promises.unlink(req.file.path).catch(() => { });
      console.log("📸 Image from multipart upload");
    } else if (imageBase64) {
      const cleaned = (imageBase64 || "").replace(/^data:.*;base64,/, "");
      imageBuffer = Buffer.from(cleaned, "base64");
      cleanImageBase64 = cleaned;
      imageFormat = detectImageFormat(cleanImageBase64);
      console.log("📸 Image from base64 payload");
    }

    // ==================== DEMO: NO FORENSICS, NO AI ANALYSIS ====================
    console.log("\n" + "=".repeat(60));
    console.log("DEMO MODE: SKIPPING OLLAMA CALLS");
    console.log("=".repeat(60));

    // Simple demo analysis without OLLAMA
    let visionAnalysis = {
      detected: [],
      emergency_detected: [],
      severity: "Medium",
      people_count: 0,
      confidence: 0,
      isReal: true,
      imageFormat: imageFormat || { type: "UNKNOWN", maxTrustScore: 50 },
      model: "Demo (No OLLAMA)",
    };

    let voiceAnalysis = {
      keywords: [],
      sentiment: "neutral",
      urgency: 5,
      confidence: 0,
      model: "Demo (No OLLAMA)",
    };

    let semantics = { alignmentScore: 0 };
    let textIntelligence = {
      translatedText: description || transcript || "",
      detectedType: "Other",
    };

    // Simple keyword extraction from text/transcript
    const allText = (description || transcript || "").toLowerCase();
    if (allText.includes("fire")) {
      visionAnalysis.emergency_detected.push("fire");
      voiceAnalysis.keywords.push("fire");
      textIntelligence.detectedType = "Fire";
    }
    if (allText.includes("blood") || allText.includes("injury")) {
      visionAnalysis.emergency_detected.push("injury");
      voiceAnalysis.keywords.push("injury");
      textIntelligence.detectedType = "Medical Emergency";
    }
    if (allText.includes("flood") || allText.includes("water")) {
      visionAnalysis.emergency_detected.push("flood");
      voiceAnalysis.keywords.push("flood");
      textIntelligence.detectedType = "Flood";
    }
    if (allText.includes("accident") || allText.includes("crash")) {
      visionAnalysis.emergency_detected.push("accident");
      voiceAnalysis.keywords.push("accident");
      textIntelligence.detectedType = "Traffic Accident";
    }
    if (allText.includes("help") || allText.includes("emergency")) {
      voiceAnalysis.keywords.push("help");
    }

    console.log(`   Keywords extracted: ${voiceAnalysis.keywords.join(", ") || "None"}`);
    console.log(`   Type detected: ${textIntelligence.detectedType}`);

    // ==================== DEMO: TRUST SCORE CAPPED BELOW 20 ====================
    console.log("\n" + "=".repeat(60));
    console.log("DEMO MODE: TRUST SCORE CAPPING");
    console.log("=".repeat(60));

    // Generate random trust score between 5-20 for demo
    const demoTrustScore = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    console.log(`   🔴 DEMO MODE: Trust score capped to ${demoTrustScore} (max 20)`);

    const trustScoreData = {
      totalScore: demoTrustScore,
      formula: "DEMO_STATIC",
      breakdown: {
        visual: 0,
        alignment: 0,
        consensus: 0,
      },
      locationConsensus: { score: 0, nearbyIncidents: 0 },
      imageFormat: imageFormat,
    };

    // ==================== DETERMINE SEVERITY WITH LOW TRUST SCORE ====================
    const determinedSeverity = determineSeverityFromTrustScore(
      demoTrustScore,
      visionAnalysis,
      voiceAnalysis
    );

    console.log(`   Final Severity: ${determinedSeverity}`);

    // ==================== SIMPLE PRIORITY CODE ====================
    let priorityCode = {
      code: "ALPHA",
      description: "🟢 STANDARD: Demo report (low trust)",
      dispatchLevel: 2,
      autoDispatch: false,
    };

    // ==================== UPLOAD IMAGE ====================
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

    // ==================== AUTO-DETECT TYPE ====================
    let detectedType = type || textIntelligence.detectedType || "Other";

    // ==================== FIND OR CREATE DEMO USER ====================
    let demoUser = await User.findOne({ email: demoUserEmail });

    if (!demoUser) {
      demoUser = new User({
        name: "Demo User",
        email: demoUserEmail,
        phone: "+1-DEMO-000",
        role: "citizen",
        isDemo: true,
        password: "demo_no_auth_required",
      });
      await demoUser.save();
      console.log(`✅ Demo user created: ${demoUserEmail}`);
    } else {
      console.log(`✅ Demo user found: ${demoUser.email} | Phone: ${demoUser.phone}`);
    }

    // ==================== SAVE TO DATABASE ====================
    const incidentData = {
      type: detectedType,
      description: textIntelligence.translatedText,
      severity: determinedSeverity,
      mode,
      transcript: transcript || undefined,
      language: language || "en",
      imageUrl,
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
      reportedBy: demoUser._id,
      forensics: {
        realismFactor: 1.0,
        isFake: false,
        confidenceScore: 0,
        isPocket: false,
        verdict: "Demo mode (no forensics)",
      },
      aiAnalysis: {
        vision: visionAnalysis,
        voice: voiceAnalysis,
        semantics,
        textIntelligence,
      },
      trustScore: trustScoreData,
      priorityCode,
      status: "Pending",
      verificationLog: [],
    };

    const incident = new Incident(incidentData);
    await incident.save();
    await incident.populate("reportedBy", "name email phone role");

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ DEMO INCIDENT CREATED");
    console.log(`📊 Processing Time: ${processingTime}s`);
    console.log(`🆔 Incident ID: ${incident._id}`);
    console.log(`📊 Trust Score: ${demoTrustScore} (CAPPED <20)`);
    console.log(`🔴 Severity: ${determinedSeverity}`);
    console.log(`🏷️ Type: ${detectedType}`);
    console.log("█".repeat(80) + "\n");

    return res.status(201).json({
      success: true,
      message: "✅ Demo incident created successfully",
      incident,
      priorityCode,
      trustScore: demoTrustScore,
      severity: determinedSeverity,
      demoUser: {
        id: demoUser._id,
        email: demoUser.email,
        name: demoUser.name,
      },
      processingTime: `${processingTime}s`,
    });
  } catch (err) {
    console.error("❌ createIncidentDemo error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Server error",
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

    const incident = await Incident.findByIdAndUpdate(
      incidentId,
      {
        ...(status && { status }),
        ...(respondedBy && { respondedBy }),
        ...(dispatchedResources && { dispatchedResources }),
      },
      { new: true }
    ).populate("reportedBy");

    if (!incident)
      return res.status(404).json({ message: "Incident not found" });

    if (status === "Resolved" && client && incident.reportedBy?.phone) {
      try {
        await client.messages.create({
          body: `✅ INCIDENT RESOLVED: The emergency report #${incident._id
            .toString()
            .slice(-4)} has been closed. All units are returning to base. Stay safe!`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: incident.reportedBy.phone,
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



// ...existing code...

/**
 * ==================== GROUP & CLUSTER INCIDENTS BY LOCATION ====================
 * Groups incidents by TYPE and CLUSTERS similar incidents by proximity
 * Supports dynamic radius: 10m, 20m, 50m, 100m, 500m, 1000m
 * Shows which incidents are DUPLICATES (same incident, multiple reports)
 */
export const groupIncidentByLocationAndType = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("📍 GROUP INCIDENTS BY LOCATION AND TYPE WITH CLUSTERING");
    console.log("=".repeat(80));

    const { latitude, longitude, radius = 100, clusterRadius = 50 } = req.query;

    // ==================== VALIDATION ====================
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required query parameters",
        code: "MISSING_COORDINATES",
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude must be valid numbers",
        code: "INVALID_COORDINATES",
      });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "latitude must be between -90 and 90",
        code: "INVALID_LATITUDE",
      });
    }

    if (lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: "longitude must be between -180 and 180",
        code: "INVALID_LONGITUDE",
      });
    }

    // Validate search radius
    const validRadii = [10, 20, 50, 100, 500, 1000, 5000, 10000];
    const searchRadiusMeters = Number(radius);

    if (!validRadii.includes(searchRadiusMeters)) {
      return res.status(400).json({
        success: false,
        message: `radius must be one of: ${validRadii.join(", ")} meters`,
        code: "INVALID_RADIUS",
        validRadii,
      });
    }

    // Cluster radius should be <= search radius
    let clusterRadiusMeters = Number(clusterRadius) || Math.min(50, searchRadiusMeters);
    if (clusterRadiusMeters < 5 || clusterRadiusMeters > searchRadiusMeters) {
      clusterRadiusMeters = Math.min(50, searchRadiusMeters);
    }

    console.log(`   📍 Location: (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
    console.log(`   📏 Search Radius: ${searchRadiusMeters}m (${(searchRadiusMeters / 1000).toFixed(1)}km)`);
    console.log(`   🔗 Cluster Radius (within same incident): ${clusterRadiusMeters}m`);

    // ==================== DEBUG: Check all incidents in DB ====================
    const allIncidents = await Incident.countDocuments();
    const allLocationIncidents = await Incident.countDocuments({ location: { $exists: true } });
    const spamIncidents = await Incident.countDocuments({ status: "Spam" });
    const nonSpamIncidents = await Incident.countDocuments({ status: { $ne: "Spam" } });

    console.log(`\n📊 DATABASE STATS:`);
    console.log(`   Total incidents in DB: ${allIncidents}`);
    console.log(`   Incidents with location field: ${allLocationIncidents}`);
    console.log(`   Spam incidents: ${spamIncidents}`);
    console.log(`   Non-spam incidents: ${nonSpamIncidents}`);

    // ==================== GEOSPATIAL QUERY ====================
    const earthRadiusMeters = 6378137;
    const searchRadiusInRadians = searchRadiusMeters / earthRadiusMeters;

    const query = {
      location: {
        $geoWithin: {
          $centerSphere: [[lon, lat], searchRadiusInRadians],
        },
      },
      status: { $ne: "Spam" },
    };

    const startTime = Date.now();

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .populate("reportedBy", "name email phone role")
      .populate("respondedBy", "name email phone role")
      .populate("dispatchedResources", "name type status")
      .select(
        "_id type severity status description location trustScore priorityCode reportedBy respondedBy dispatchedResources createdAt mode"
      )
      .lean();

    const queryTime = Date.now() - startTime;

    console.log(`\n✅ GEOSPATIAL QUERY RESULTS:`);
    console.log(`   Query time: ${queryTime}ms`);
    console.log(`   📊 Incidents within radius: ${incidents.length}`);

    // Log first incident for debugging
    if (incidents.length > 0) {
      console.log(`   📍 First incident location:`, incidents[0].location);
      console.log(`   📍 Query center: [${lon}, ${lat}]`);
      console.log(`   ✅ INCIDENTS FOUND! Ready to cluster...`);
    } else {
      console.log(`   ⚠️ NO INCIDENTS FOUND - checking search area...`);
      // Check if there are ANY non-spam incidents with location
      const anyNonSpam = await Incident.findOne({ status: { $ne: "Spam" }, location: { $exists: true } });
      if (anyNonSpam) {
        console.log(`   📍 Sample non-spam incident location:`, anyNonSpam.location);
        console.log(`   📏 Sample is at: [${anyNonSpam.location.coordinates[0]}, ${anyNonSpam.location.coordinates[1]}]`);
        console.log(`   📏 Query is at:  [${lon}, ${lat}]`);

        // Calculate distance to sample
        const R = 6371;
        const dLat = ((anyNonSpam.location.coordinates[1] - lat) * Math.PI) / 180;
        const dLon = ((anyNonSpam.location.coordinates[0] - lon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
          Math.cos((anyNonSpam.location.coordinates[1] * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        const distanceMeters = Math.round(distanceKm * 1000);

        console.log(`   💡 Sample incident is ${distanceMeters}m away (search radius is ${searchRadiusMeters}m)`);
        console.log(`   💡 Try increasing the search radius if your incidents are spread out`);
      } else {
        console.log(`   💡 No non-spam incidents with location found in database`);
      }
    }

    // ==================== HELPER: CALCULATE DISTANCE BETWEEN TWO INCIDENTS ====================
    const calculateDistanceBetweenIncidents = (incident1, incident2) => {
      const R = 6371; // km
      const lat1 = incident1.location.coordinates[1];
      const lon1 = incident1.location.coordinates[0];
      const lat2 = incident2.location.coordinates[1];
      const lon2 = incident2.location.coordinates[0];

      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 1000); // meters
    };

    // ==================== CALCULATE DISTANCES FROM QUERY LOCATION ====================
    const incidentsWithDistance = incidents.map((incident) => {
      const incidentLon = incident.location.coordinates[0];
      const incidentLat = incident.location.coordinates[1];

      const R = 6371;
      const dLat = ((incidentLat - lat) * Math.PI) / 180;
      const dLon = ((incidentLon - lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
        Math.cos((incidentLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;
      const distanceMeters = Math.round(distanceKm * 1000);

      return {
        _id: incident._id,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        mode: incident.mode,
        description: incident.description,
        trustScore: incident.trustScore?.totalScore || 0,
        priorityCode: incident.priorityCode?.code || "ALPHA",
        dispatchLevel: incident.priorityCode?.dispatchLevel || 1,
        reportedBy: incident.reportedBy,
        respondedBy: incident.respondedBy,
        dispatchedResources: incident.dispatchedResources,
        location: {
          latitude: incidentLat,
          longitude: incidentLon,
        },
        distance: {
          meters: distanceMeters,
          kilometers: parseFloat(distanceKm.toFixed(3)),
        },
        createdAt: incident.createdAt,
      };
    });

    // ==================== GROUP BY TYPE ====================
    const groupedByType = {};

    incidentsWithDistance.forEach((incident) => {
      const type = incident.type || "Unknown";

      if (!groupedByType[type]) {
        groupedByType[type] = {
          type,
          totalCount: 0,
          clusters: [],
          rawIncidents: [],
        };
      }

      groupedByType[type].totalCount += 1;
      groupedByType[type].rawIncidents.push(incident);
    });

    // ==================== CLUSTER WITHIN EACH TYPE ====================
    const groupedResults = Object.values(groupedByType).map((group) => {
      const incidents = group.rawIncidents;
      const clusters = [];
      const assignedIncidents = new Set();

      // DBSCAN-like clustering algorithm
      incidents.forEach((incident, idx) => {
        if (assignedIncidents.has(incident._id.toString())) {
          return; // Already in a cluster
        }

        // Create new cluster
        const cluster = {
          clusterId: `${group.type}_cluster_${clusters.length + 1}`,
          centerLocation: {
            latitude: incident.location.latitude,
            longitude: incident.location.longitude,
          },
          incidents: [incident],
          count: 1,
          isSingleReport: true,
          isDuplicate: false,
          statistics: {
            bySeverity: {},
            byStatus: {},
            byMode: {},
            trustScores: { min: 100, max: 0, average: 0 },
            distanceMetrics: { min: 0, max: 0, average: 0 },
          },
        };

        assignedIncidents.add(incident._id.toString());

        // Find nearby incidents (within clusterRadius)
        incidents.forEach((otherIncident, otherIdx) => {
          if (
            assignedIncidents.has(otherIncident._id.toString()) ||
            idx === otherIdx
          ) {
            return;
          }

          const distMeters = calculateDistanceBetweenIncidents(
            incident,
            otherIncident
          );

          if (distMeters <= clusterRadiusMeters) {
            cluster.incidents.push(otherIncident);
            cluster.count += 1;
            assignedIncidents.add(otherIncident._id.toString());
          }
        });

        // Mark if duplicate reports
        if (cluster.count > 1) {
          cluster.isSingleReport = false;
          cluster.isDuplicate = true;
        }

        // Calculate cluster statistics
        let totalTrustScore = 0;
        let totalDistance = 0;

        cluster.incidents.forEach((inc, incIdx) => {
          // Severity
          cluster.statistics.bySeverity[inc.severity] =
            (cluster.statistics.bySeverity[inc.severity] || 0) + 1;

          // Status
          cluster.statistics.byStatus[inc.status] =
            (cluster.statistics.byStatus[inc.status] || 0) + 1;

          // Mode
          cluster.statistics.byMode[inc.mode] =
            (cluster.statistics.byMode[inc.mode] || 0) + 1;

          // Trust score
          totalTrustScore += inc.trustScore;
          cluster.statistics.trustScores.min = Math.min(
            cluster.statistics.trustScores.min,
            inc.trustScore
          );
          cluster.statistics.trustScores.max = Math.max(
            cluster.statistics.trustScores.max,
            inc.trustScore
          );

          // Distance from first incident in cluster
          const distFromFirst = calculateDistanceBetweenIncidents(
            cluster.incidents[0],
            inc
          );
          if (incIdx === 0) {
            cluster.statistics.distanceMetrics.min = 0;
          } else {
            cluster.statistics.distanceMetrics.min = Math.min(
              cluster.statistics.distanceMetrics.min || Infinity,
              distFromFirst
            );
          }
          cluster.statistics.distanceMetrics.max = Math.max(
            cluster.statistics.distanceMetrics.max,
            distFromFirst
          );
          totalDistance += distFromFirst;
        });

        if (cluster.count > 0) {
          cluster.statistics.trustScores.average = parseFloat(
            (totalTrustScore / cluster.count).toFixed(2)
          );
          cluster.statistics.distanceMetrics.average = Math.round(
            totalDistance / cluster.count
          );
        }

        // Sort incidents within cluster by time (newest first)
        cluster.incidents.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        clusters.push(cluster);
      });

      // Sort clusters by: duplicates first, then by count
      clusters.sort((a, b) => {
        if (a.isDuplicate !== b.isDuplicate) {
          return a.isDuplicate ? -1 : 1; // Duplicates first
        }
        return b.count - a.count; // Then by count
      });

      // ==================== GROUP STATISTICS ====================
      const statistics = {
        totalIncidents: incidents.length,
        clusterCount: clusters.length,
        duplicateClusters: clusters.filter((c) => c.isDuplicate).length,
        singleReportClusters: clusters.filter((c) => c.isSingleReport).length,
        bySeverity: { Critical: 0, High: 0, Medium: 0, Low: 0 },
        byStatus: { Pending: 0, Active: 0, Resolved: 0 },
        byMode: {},
        trustScores: { min: 100, max: 0, average: 0 },
        distanceMetrics: {
          closest: Infinity,
          farthest: 0,
          average: 0,
        },
      };

      let totalTrustScore = 0;
      let totalDistance = 0;

      incidents.forEach((incident) => {
        statistics.bySeverity[incident.severity] =
          (statistics.bySeverity[incident.severity] || 0) + 1;
        statistics.byStatus[incident.status] =
          (statistics.byStatus[incident.status] || 0) + 1;
        statistics.byMode[incident.mode] =
          (statistics.byMode[incident.mode] || 0) + 1;

        totalTrustScore += incident.trustScore;
        statistics.trustScores.min = Math.min(
          statistics.trustScores.min,
          incident.trustScore
        );
        statistics.trustScores.max = Math.max(
          statistics.trustScores.max,
          incident.trustScore
        );

        statistics.distanceMetrics.closest = Math.min(
          statistics.distanceMetrics.closest,
          incident.distance.meters
        );
        statistics.distanceMetrics.farthest = Math.max(
          statistics.distanceMetrics.farthest,
          incident.distance.meters
        );
        totalDistance += incident.distance.meters;
      });

      if (incidents.length > 0) {
        statistics.trustScores.average = parseFloat(
          (totalTrustScore / incidents.length).toFixed(2)
        );
        statistics.distanceMetrics.average = Math.round(
          totalDistance / incidents.length
        );
      }

      return {
        type: group.type,
        totalCount: group.totalCount,
        clusters,
        statistics,
      };
    });

    // Sort groups by incident count
    groupedResults.sort((a, b) => b.totalCount - a.totalCount);

    // ==================== OVERALL STATISTICS ====================
    const overallStatistics = {
      searchRadius: searchRadiusMeters,
      clusterRadius: clusterRadiusMeters,
      totalIncidents: incidentsWithDistance.length,
      totalTypeGroups: groupedResults.length,
      totalClusters: groupedResults.reduce(
        (sum, g) => sum + g.clusters.length,
        0
      ),
      totalDuplicateClusters: groupedResults.reduce(
        (sum, g) => sum + g.statistics.duplicateClusters,
        0
      ),
      bySeverity: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      byStatus: { Pending: 0, Active: 0, Resolved: 0 },
      byMode: {},
      trustScores: { min: 100, max: 0, average: 0 },
    };

    let totalTrustScore = 0;

    incidentsWithDistance.forEach((incident) => {
      overallStatistics.bySeverity[incident.severity] =
        (overallStatistics.bySeverity[incident.severity] || 0) + 1;
      overallStatistics.byStatus[incident.status] =
        (overallStatistics.byStatus[incident.status] || 0) + 1;
      overallStatistics.byMode[incident.mode] =
        (overallStatistics.byMode[incident.mode] || 0) + 1;

      totalTrustScore += incident.trustScore;
      overallStatistics.trustScores.min = Math.min(
        overallStatistics.trustScores.min,
        incident.trustScore
      );
      overallStatistics.trustScores.max = Math.max(
        overallStatistics.trustScores.max,
        incident.trustScore
      );
    });

    if (incidentsWithDistance.length > 0) {
      overallStatistics.trustScores.average = parseFloat(
        (totalTrustScore / incidentsWithDistance.length).toFixed(2)
      );
    }

    console.log(`\n📊 CLUSTERING RESULTS:`);
    console.log(`   Total Type Groups: ${groupedResults.length}`);
    console.log(
      `   Total Clusters: ${overallStatistics.totalClusters} (${overallStatistics.totalDuplicateClusters} are duplicates)`
    );
    groupedResults.forEach((group) => {
      console.log(
        `   📍 ${group.type}: ${group.totalCount} incidents in ${group.clusters.length} clusters`
      );
      group.clusters.forEach((cluster) => {
        const marker = cluster.isDuplicate ? "🔴 DUPLICATE" : "✅ UNIQUE";
        console.log(
          `      ${marker} Cluster ${cluster.clusterId}: ${cluster.count} reports within ${clusterRadiusMeters}m`
        );
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        queryLocation: {
          latitude: lat,
          longitude: lon,
          searchRadiusMeters,
          clusterRadiusMeters,
        },
        groupedIncidents: groupedResults,
        overallStatistics,
        metadata: {
          queryTime: `${queryTime}ms`,
          timestamp: new Date().toISOString(),
          note: "Incidents grouped by type, then clustered by proximity. Red clusters = duplicate reports of same incident. Green clusters = unique incidents.",
        },
      },
    });
  } catch (err) {
    console.error("❌ groupIncidentByLocationAndType error:", err.message);
    console.error(err.stack);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development" ? err.message : "Server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
};

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
  groupIncidentByLocationAndType
};