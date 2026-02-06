
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
      await fs.promises.unlink(req.file.path).catch(() => {});
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
      await fs.promises.unlink(req.file.path).catch(() => {});
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

    const [total, resolved, active, pending, spam, trendByDay, byType, bySeverity, byStatus, byPriority, byMode, trustBuckets] =
      await Promise.all([
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
      ]);

    return res.status(200).json({
      range: { days, start, end, timezone },
      summary: {
        total,
        resolved,
        active,
        pending,
        spam,
        resolutionRate: total ? Number(((resolved / total) * 100).toFixed(1)) : 0,
      },
      trends: trendByDay.map((d) => ({ date: d._id, count: d.count })),
      byType: byType.map((d) => ({ type: d._id || "Unknown", count: d.count })),
      bySeverity: bySeverity.map((d) => ({
        severity: d._id || "Unknown",
        count: d.count,
      })),
      byStatus: byStatus.map((d) => ({
        status: d._id || "Unknown",
        count: d.count,
      })),
      byPriority: byPriority.map((d) => ({
        code: d._id || "Unknown",
        count: d.count,
      })),
      byMode: byMode.map((d) => ({ mode: d._id || "Unknown", count: d.count })),
      trustScoreBuckets: trustBuckets.map((b) => ({
        range:
          b._id === "unknown"
            ? "unknown"
            : `${b._id}-${Number(b._id) + 20}`,
        count: b.count,
      })),
    });
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