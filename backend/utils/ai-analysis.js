
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OLLAMA_URL = "http://localhost:11434/api/generate";
const TEXT_MODEL = "qwen3-coder:480b-cloud";
const VISION_MODEL = "gemma3:4b";

let ollamaConnectionCache = { status: null, timestamp: 0, cacheDuration: 30000 };

/**
 * ==================== IMAGE FORMAT DETECTION ====================
 * PNG images get LOW trust scores (max 30)
 * JPEG gets normal scoring
 */
export const detectImageFormat = (imageBase64) => {
  const format = {
    type: "UNKNOWN",
    isPNG: false,
    isJPEG: false,
    isWebP: false,
    maxTrustScore: 100,
    trustMultiplier: 1.0,
    warning: null,
  };

  if (imageBase64.startsWith("iVBOR")) {
    format.type = "PNG";
    format.isPNG = true;
    format.maxTrustScore = 30;
    format.trustMultiplier = 0.3;
    format.warning = "⚠️ PNG FORMAT: Typically AI-generated or edited. Max trust score capped at 30.";
    console.log("   🔴 PNG FORMAT DETECTED - Max Trust Score: 30");
  } else if (imageBase64.startsWith("/9j/")) {
    format.type = "JPEG";
    format.isJPEG = true;
    format.maxTrustScore = 100;
    format.trustMultiplier = 1.0;
    format.warning = null;
    console.log("   🟢 JPEG FORMAT DETECTED - Normal Trust Scoring");
  } else if (imageBase64.startsWith("UklGR")) {
    format.type = "WEBP";
    format.isWebP = true;
    format.maxTrustScore = 85;
    format.trustMultiplier = 0.85;
    format.warning = "⚠️ WEBP FORMAT: Applying 15% trust penalty.";
    console.log("   🟡 WEBP FORMAT DETECTED - Max Trust Score: 85");
  } else {
    format.type = "UNKNOWN";
    format.maxTrustScore = 50;
    format.trustMultiplier = 0.5;
    format.warning = "⚠️ UNKNOWN FORMAT: Cannot verify authenticity. Max trust score capped at 50.";
    console.log("   ⚠️ UNKNOWN FORMAT - Max Trust Score: 50");
  }

  return format;
};

/**
 * Check if OLLAMA is running
 */
const checkOllamaConnection = async () => {
  const now = Date.now();

  if (
    ollamaConnectionCache.status !== null &&
    now - ollamaConnectionCache.timestamp < ollamaConnectionCache.cacheDuration
  ) {
    return ollamaConnectionCache.status;
  }

  try {
    console.log("🔍 Testing OLLAMA connection...");

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: VISION_MODEL,
        prompt: "test",
        stream: false,
      },
      {
        timeout: 15000,
        validateStatus: () => true,
      }
    );

    if (response.data) {
      console.log("✅ OLLAMA is running!");
      ollamaConnectionCache.status = true;
      ollamaConnectionCache.timestamp = now;
      return true;
    }
  } catch (err) {
    console.error("❌ OLLAMA Connection Failed");
  }

  ollamaConnectionCache.status = false;
  ollamaConnectionCache.timestamp = now;
  return false;
};

/**
 * Helper: Call Ollama
 */
const callModel = async (model, prompt, opts = {}) => {
  try {
    const body = { model, prompt, stream: false, ...opts };
    const resp = await axios.post(OLLAMA_URL, body, {
      timeout: 180000,
      validateStatus: () => true,
    });

    if (!resp.data) {
      throw new Error("Empty response from OLLAMA");
    }

    return resp.data?.response ?? resp.data;
  } catch (err) {
    console.error(`❌ Model call failed (${model}):`, err.message);
    throw err;
  }
};

/**
 * ==================== TEXT INTELLIGENCE ====================
 * Translation + Type Detection
 */
export const processTextIntelligence = async (text) => {
  if (!text || text.trim().length === 0) {
    return { translatedText: "", detectedType: "Other" };
  }

  const ollamaAvailable = await checkOllamaConnection();
  if (!ollamaAvailable) {
    console.log("⚠️ OLLAMA unavailable - using fallback");
    return { translatedText: text, detectedType: "Other" };
  }

  const prompt = `You are an emergency incident classifier.

Analyze this text: "${text}"

1. Translate to English if needed
2. Categorize into ONE: Fire, Flood, Medical Emergency, Traffic Accident, Infrastructure, or Other

Respond with ONLY JSON (no other text):
{
  "translatedText": "English version",
  "detectedType": "Category"
}`;

  try {
    console.log(`\n🧠 Text Intelligence (${TEXT_MODEL})...`);

    const response = await callModel(TEXT_MODEL, prompt, {
      format: "json",
      options: { temperature: 0.1 },
    });

    let result;
    try {
      result = JSON.parse(response);
    } catch (parseError) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw parseError;
      }
    }

    const validTypes = [
      "Fire",
      "Flood",
      "Medical Emergency",
      "Traffic Accident",
      "Infrastructure",
      "Other",
    ];
    const detectedType = validTypes.includes(result.detectedType)
      ? result.detectedType
      : "Other";

    console.log(`   ✅ Translated: "${result.translatedText}"`);
    console.log(`   ✅ Type: ${detectedType}`);

    return {
      translatedText: result.translatedText || text,
      detectedType,
    };
  } catch (err) {
    console.error("⚠️ Text Intelligence Error:", err.message);
    return { translatedText: text, detectedType: "Other" };
  }
};

/**
 * ==================== VISION ANALYSIS ====================
 * WITH IMAGE FORMAT DETECTION (PNG handling)
 */
export const analyzeVision = async (imageBase64) => {
  const ollamaAvailable = await checkOllamaConnection();
  if (!ollamaAvailable) {
    return {
      detected: [],
      emergency_detected: [],
      severity: "Medium",
      people_count: 0,
      confidence: 0,
      isReal: true,
      imageFormat: {
        type: "UNKNOWN",
        maxTrustScore: 50,
        trustMultiplier: 1.0,
        warning: null,
      },
      model: "Offline",
    };
  }

  try {
    console.log(`\n👀 VISION ANALYSIS (${VISION_MODEL})...`);

    // 🔴 DETECT IMAGE FORMAT FIRST
    const imageFormat = detectImageFormat(imageBase64);

    const visionPrompt = `Analyze this emergency image and identify:
1. Emergency objects (fire, smoke, blood, injuries, debris, water, vehicles, people)
2. Severity assessment
3. Number of people visible
4. Key details about the emergency

Respond with ONLY JSON (no other text):
{
  "detected": ["object1", "object2"],
  "emergency_detected": ["object1", "object2"],
  "severity": "Critical|High|Medium|Low",
  "people_count": 0,
  "confidence": 85,
  "details": "Brief description"
}`;

    const response = await callModel(VISION_MODEL, visionPrompt, {
      images: [imageBase64],
      format: "json",
      options: { temperature: 0.3, num_predict: 300 },
    });

    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch (parseError) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = {
          detected: [],
          emergency_detected: [],
          severity: "Medium",
          people_count: 0,
          confidence: 0,
          details: "Analysis failed",
        };
      }
    }

    const validSeverities = ["Low", "Medium", "High", "Critical"];
    const severity = validSeverities.includes(analysis.severity)
      ? analysis.severity
      : "Medium";

    // 🔴 CAP CONFIDENCE BASED ON FORMAT
    let finalConfidence = (analysis.confidence || 0) * imageFormat.trustMultiplier;
    finalConfidence = Math.min(finalConfidence, imageFormat.maxTrustScore);

    console.log(
      `   ✅ Objects: ${(analysis.detected || analysis.emergency_detected || []).join(", ") || "None"}`
    );
    console.log(`   ✅ Severity: ${severity}`);
    console.log(`   ✅ Raw Confidence: ${analysis.confidence || 0}%`);
    console.log(`   ✅ Format: ${imageFormat.type}`);
    console.log(
      `   ✅ Final Confidence: ${finalConfidence.toFixed(1)}% (max: ${imageFormat.maxTrustScore})`
    );
    if (imageFormat.warning) console.log(`   ${imageFormat.warning}`);

    return {
      detected: analysis.detected || analysis.emergency_detected || [],
      emergency_detected: analysis.emergency_detected || analysis.detected || [],
      severity,
      people_count: analysis.people_count || 0,
      confidence: finalConfidence,
      rawConfidence: analysis.confidence || 0,
      isReal: true,
      imageFormat: imageFormat,
      model: VISION_MODEL,
    };
  } catch (err) {
    console.error("❌ Vision error:", err.message);
    return {
      detected: [],
      emergency_detected: [],
      severity: "Medium",
      people_count: 0,
      confidence: 0,
      isReal: true,
      imageFormat: {
        type: "UNKNOWN",
        maxTrustScore: 50,
        trustMultiplier: 1.0,
        warning: null,
      },
      model: "Error",
    };
  }
};

/**
 * ==================== VOICE ANALYSIS ====================
 */
export const analyzeVoice = async (audioTranscript) => {
  if (!audioTranscript || audioTranscript.trim().length === 0) {
    return {
      keywords: [],
      sentiment: "neutral",
      urgency: 5,
      confidence: 0,
      model: "Empty Input",
    };
  }

  const ollamaAvailable = await checkOllamaConnection();
  if (!ollamaAvailable) {
    console.log("⚠️ OLLAMA unavailable - using fallback voice analysis");
    return performFallbackVoiceAnalysis(audioTranscript);
  }

  try {
    console.log(`\n🎤 VOICE ANALYSIS (${TEXT_MODEL})...`);

    const prompt = `Analyze this emergency transcript: "${audioTranscript}"

Extract:
1. Keywords (emergency-related words)
2. Sentiment (panic|calm|neutral)
3. Urgency level (1-10)
4. Confidence in analysis

Respond with ONLY JSON (no other text):
{
  "keywords": ["keyword1", "keyword2"],
  "sentiment": "panic|calm|neutral",
  "urgency": 7,
  "confidence": 80
}`;

    const response = await callModel(TEXT_MODEL, prompt, {
      format: "json",
      options: { temperature: 0.2, num_predict: 200 },
    });

    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch (parseError) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        return performFallbackVoiceAnalysis(audioTranscript);
      }
    }

    const keywords = analysis.keywords || [];
    const sentiment = ["panic", "calm", "neutral"].includes(analysis.sentiment)
      ? analysis.sentiment
      : "neutral";
    const urgency = Math.max(1, Math.min(10, analysis.urgency || 5));
    const confidence = analysis.confidence || 0;

    console.log(`   ✅ Keywords: ${keywords.join(", ") || "None"}`);
    console.log(`   ✅ Sentiment: ${sentiment}`);
    console.log(`   ✅ Urgency: ${urgency}/10`);
    console.log(`   ✅ Confidence: ${confidence}%`);

    return { keywords, sentiment, urgency, confidence, model: TEXT_MODEL };
  } catch (err) {
    console.error("❌ Voice error:", err.message);
    return performFallbackVoiceAnalysis(audioTranscript);
  }
};

/**
 * ==================== SEMANTIC ALIGNMENT ====================
 */
export const analyzeSemantics = (visionAnalysis, voiceAnalysis) => {
  console.log("\n🧠 SEMANTIC ALIGNMENT...");

  const vision = new Set(
    (visionAnalysis.emergency_detected || visionAnalysis.detected || []).map(
      (x) => x.toLowerCase()
    )
  );
  const voice = new Set(
    (voiceAnalysis.keywords || []).map((x) => x.toLowerCase())
  );

  let overlap = 0;
  voice.forEach((v) => {
    [...vision].forEach((vis) => {
      if (vis.includes(v) || v.includes(vis)) overlap++;
    });
  });

  const totalTerms = Math.max(vision.size, voice.size, 1);
  const alignmentScore = Math.min(100, (overlap / totalTerms) * 100 + 30);

  console.log(`   Vision terms: ${vision.size}`);
  console.log(`   Voice keywords: ${voice.size}`);
  console.log(`   Overlap: ${overlap}`);
  console.log(`   Alignment Score: ${alignmentScore.toFixed(1)}%`);

  return {
    alignmentScore,
    overlap,
    visionTerms: vision.size,
    voiceTerms: voice.size,
    model: "alignment_v1",
  };
};

/**
 * ==================== FALLBACK FUNCTIONS ====================
 */
const performFallbackVoiceAnalysis = (transcript) => {
  const lowerText = transcript.toLowerCase();
  const keywords = [];
  const emergencyKeywords = [
    "help",
    "emergency",
    "fire",
    "trapped",
    "bleeding",
    "accident",
    "drowning",
  ];

  emergencyKeywords.forEach((k) => {
    if (lowerText.includes(k)) keywords.push(k);
  });

  let sentiment = "neutral";
  if (["help", "please", "hurry"].some((w) => lowerText.includes(w)))
    sentiment = "panic";

  let urgency = 5;
  if (keywords.length > 2) urgency = 7;

  return { keywords, sentiment, urgency, confidence: 40, model: "Fallback" };
};

// ==================== EXPORTS ====================
export default {
  analyzeVision,
  analyzeVoice,
  analyzeSemantics,
  processTextIntelligence,
  callModel,
  checkOllamaConnection,
  detectImageFormat,
};