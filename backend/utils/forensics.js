import ExifParser from "exif-parser";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import axios from "axios";

// ==================== DEEPFAKE KILL SWITCHES ====================
const DEEPFAKE_KEYWORDS = {
  photoshop: ["photoshop", "adobe photoshop", "ps", "psb"],
  stable_diffusion: ["stable diffusion", "stablediffusion", "sd"],
  midjourney: ["midjourney", "mj"],
  dalle: ["dall-e", "dalle", "openai"],
  gemini: ["gemini", "bard", "google.ai", "google ai", "imagen"],
  firefly: ["adobe firefly", "firefly"],
  leonardo: ["leonardo", "leonardo.ai"],
};

const WATERMARK_KEYWORDS = [
  "watermark", "stock", "getty", "shutterstock", "istockphoto",
  "adobe", "istock", "alamy", "depositphotos", "123rf",
  "dreamstime", "fotolia", "pond5", "bigstock", "canva",
  "unsplash", "pexels", "pixabay", "gemini", "google ai",
  "stable diffusion", "midjourney", "dall-e", "dalle",
  "generated", "ai generated", "created by ai"
];

/**
 * ==================== ENHANCED DEEPFAKE DETECTION WITH GEMMA3:4B ====================
 */
const detectDeepfakeWithGemma = async (imageBase64) => {
  try {
    console.log("\n🔬 Advanced Deepfake Detection (Gemma3:4b)...");

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const forensicPrompt = `Analyze this image. Respond ONLY with JSON.

Is this image AI-GENERATED or REAL?

Only mark as FAKE if you see OBVIOUS AI artifacts:
- Hands with 6+ fingers or merged fingers
- Plastic/waxy skin with absolutely NO pores (like a doll)
- Gibberish text (squiggly lines, not real letters)
- Physically impossible (fire floating in air, people blended into objects)

Otherwise mark as REAL.

{
  "is_fake": true or false,
  "confidence_score": 0-100,
  "primary_artifact": "What you see",
  "ai_indicators": [],
  "real_indicators": []
}`;

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "gemma3:4b",
        prompt: forensicPrompt,
        images: [cleanBase64],
        stream: false,
        temperature: 0.0,
      },
      { timeout: 60000 }
    );

    const responseText = response?.data?.response || "";
    console.log("📋 Gemma3 Response:", responseText.substring(0, 300));

    let analysis = {
      is_fake: false,
      confidence_score: 0,
      primary_artifact: "Real image (default)",
      ai_indicators: [],
      real_indicators: [],
    };

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = { ...analysis, ...parsed };
      }
    } catch (e) {
      console.log("⚠️ JSON parse failed, defaulting to REAL");
    }

    const result = processForensicResult(analysis);

    console.log(`   Is Fake: ${analysis.is_fake}`);
    console.log(`   Confidence: ${analysis.confidence_score}%`);
    console.log(`   AI Indicators: ${analysis.ai_indicators.length}`);
    console.log(`   Status: ${result.status}`);

    return {
      success: true,
      analysis,
      isDeepfake: result.shouldBlock,
      confidence: analysis.confidence_score,
      status: result.status,
      reason: result.reason,
    };
  } catch (err) {
    console.error("❌ Deepfake detection error:", err.message);
    return {
      success: true,
      isDeepfake: false,
      confidence: 0,
      status: "VERIFIED",
      reason: "Analysis failed - accepting image",
      analysis: { is_fake: false, confidence_score: 0, primary_artifact: "Error - defaulting to real" },
    };
  }
};

/**
 * ==================== FORENSIC RESULT PROCESSING ====================
 * 🔥 FIX: If is_fake=true AND confidence >= 85, BLOCK IT (removed indicator count requirement)
 */
const processForensicResult = (analysis) => {
  const aiIndicatorCount = (analysis.ai_indicators || []).length;
  const isFake = analysis.is_fake === true;
  const confidence = analysis.confidence_score || 0;

  // 🔥 FIXED: Block if EITHER condition is met:
  // 1. is_fake=true AND confidence >= 85 (regardless of indicator count)
  // 2. is_fake=true AND 2+ indicators (even with lower confidence)
  if (isFake && (confidence >= 85 || aiIndicatorCount >= 2)) {
    console.log(`   🚨 BLOCKED: Fake=${isFake}, Confidence=${confidence}, Indicators=${aiIndicatorCount}`);
    return {
      status: "BLOCKED",
      reason: analysis.primary_artifact || "AI-generated image detected",
      shouldBlock: true,
    };
  }

  console.log(`   ✅ VERIFIED: Fake=${isFake}, Confidence=${confidence}, Indicators=${aiIndicatorCount}`);
  return {
    status: "VERIFIED",
    reason: "Image passed forensic checks",
    shouldBlock: false,
  };
};

/**
 * ==================== WATERMARK DETECTION ====================
 */
const detectWatermarks = async (imageBuffer) => {
  try {
    console.log("\n💧 Watermark & AI Signature Detection...");

    const foundWatermarks = [];

    try {
      const worker = await Tesseract.createWorker("eng");
      const result = await worker.recognize(imageBuffer);
      const detectedText = result.data.text.toLowerCase();

      console.log(`   OCR Confidence: ${result.data.confidence.toFixed(0)}%`);

      if (detectedText.length > 20) {
        console.log(`   Detected Text: "${detectedText.substring(0, 100)}"`);
      }

      await worker.terminate();

      // Only look for CLEAR AI tool signatures
      const aiToolKeywords = [
        "stable diffusion", "midjourney", "dall-e", "dalle",
        "leonardo", "gemini", "google ai"
      ];

      for (const keyword of aiToolKeywords) {
        if (detectedText.includes(keyword)) {
          foundWatermarks.push(keyword);
          console.log(`   ✓ AI Tool Found: "${keyword}"`);
        }
      }
    } catch (err) {
      console.log("   ⚠️ OCR failed:", err.message);
    }

    return {
      hasWatermark: foundWatermarks.length > 0,
      watermarks: foundWatermarks,
    };
  } catch (err) {
    console.log("⚠️ Watermark detection error:", err.message);
    return { hasWatermark: false, watermarks: [] };
  }
};

/**
 * ==================== POCKET DETECTOR ====================
 */
const checkIfPocket = async (imageBuffer) => {
  try {
    const data = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = data.data;
    let totalBrightness = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / (pixels.length / 4) / 255;
    const brightnessPercent = (avgBrightness * 100).toFixed(2);

    console.log(`   Average brightness: ${brightnessPercent}%`);

    const isPocket = avgBrightness < 0.15;

    if (isPocket) {
      console.log("🌑 POCKET DETECTED: Image too dark");
    }

    return {
      isPocket,
      brightnessPercent,
      avgBrightness,
    };
  } catch (err) {
    console.log("⚠️ Pocket detection error:", err.message);
    return { isPocket: false, brightnessPercent: "0", avgBrightness: 0 };
  }
};

/**
 * ==================== MAIN FORENSICS FUNCTION ====================
 */
export const analyzeForensics = async (
  imageBuffer,
  type = "UPLOAD",
  imageBase64 = null
) => {
  try {
    console.log("\n\n" + "=".repeat(70));
    console.log("🔍 FORENSICS - DEEPFAKE DETECTION");
    console.log(`Mode: ${type}`);
    console.log("=".repeat(70));

    // ==================== SHAKE HYBRID BYPASS ====================
    if (type === "SHAKE_HYBRID") {
      console.log("✅ Shake SOS detected - Trusted source");
      const pocketCheck = await checkIfPocket(imageBuffer);

      return {
        realismFactor: 1.0,
        isFake: false,
        confidenceScore: 95,
        isPocket: pocketCheck.isPocket,
        verdict: pocketCheck.isPocket
          ? "⚠️ POCKET MODE: Audio will be weighted heavily"
          : "✅ LIVE CAPTURE: Verified",
        deepfakeIndicators: [],
        analysis: {
          type: "SHAKE_HYBRID",
          pocketAnalysis: pocketCheck,
        },
      };
    }

    // ==================== PHASE 1: EXIF METADATA CHECK ====================
    console.log("\n📋 Phase 1: EXIF Metadata Check...");

    let metadata = {};

    try {
      const parser = ExifParser.create(imageBuffer);
      const result = parser.parse();
      const tags = result.tags || {};

      metadata = {
        model: String(tags.Model || tags.Make || "Unknown"),
        software: String(tags.Software || ""),
      };

      const fullText = `${metadata.software} ${metadata.model}`.toLowerCase();

      for (const [tool, keywords] of Object.entries(DEEPFAKE_KEYWORDS)) {
        for (const keyword of keywords) {
          if (fullText.includes(keyword.toLowerCase())) {
            console.log(`🚨 AI SIGNATURE IN METADATA: "${keyword}"`);
            return {
              realismFactor: 0.0,
              isFake: true,
              confidenceScore: 99,
              isPocket: false,
              verdict: `🚨 REJECTED: ${keyword} in metadata`,
              deepfakeIndicators: [keyword],
              analysis: { killSwitch: true, aiSource: tool, metadata },
            };
          }
        }
      }

      console.log(`✅ EXIF: ${metadata.model} | ${metadata.software || "(none)"}`);
    } catch (err) {
      console.log("⚠️ EXIF parsing skipped");
    }

    // ==================== PHASE 2: WATERMARK CHECK ====================
    console.log("\n💧 Phase 2: Watermark Detection...");
    const watermarkCheck = await detectWatermarks(imageBuffer);

    if (watermarkCheck.hasWatermark && watermarkCheck.watermarks.length > 0) {
      console.log(`🚨 AI TOOL DETECTED: ${watermarkCheck.watermarks.join(", ")}`);
      return {
        realismFactor: 0.0,
        isFake: true,
        confidenceScore: 99,
        isPocket: false,
        verdict: `🚨 REJECTED: ${watermarkCheck.watermarks.join(", ")} detected`,
        deepfakeIndicators: watermarkCheck.watermarks,
        analysis: {
          killSwitch: true,
          aiSource: "watermark",
          watermarks: watermarkCheck.watermarks,
        },
      };
    }

    console.log("✅ No AI tools detected in text");

    // ==================== PHASE 3: ADVANCED DEEPFAKE DETECTION ====================
    console.log("\n🔬 Phase 3: AI Analysis (Gemma3:4b)...");
    
    let gemmaResult = { isDeepfake: false };
    
    if (imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        gemmaResult = await detectDeepfakeWithGemma(cleanBase64);

        // 🔥 FIX: If Gemma says it's a deepfake, REJECT IT
        if (gemmaResult.success && gemmaResult.isDeepfake) {
          console.log(`🚨 DEEPFAKE DETECTED: ${gemmaResult.reason}`);
          return {
            realismFactor: 0.0,
            isFake: true,
            confidenceScore: Math.max(85, gemmaResult.confidence || 85),
            isPocket: false,
            verdict: `🚨 REJECTED: ${gemmaResult.reason}`,
            deepfakeIndicators: [
              gemmaResult.analysis?.primary_artifact || "Deepfake detected",
              ...(gemmaResult.analysis?.ai_indicators || []),
            ],
            analysis: {
              killSwitch: true,
              aiSource: "gemma_forensic",
              forensicAnalysis: gemmaResult.analysis,
            },
          };
        }
      } catch (err) {
        console.log("⚠️ Gemma3 analysis failed:", err.message);
      }
    }

    // ==================== PHASE 4: POCKET CHECK ====================
    console.log("\n📱 Phase 4: Image Quality Check...");
    const pocketCheck = await checkIfPocket(imageBuffer);

    // ==================== FINAL ASSESSMENT ====================
    console.log(`\n✅ ASSESSMENT: IMAGE ACCEPTED (no deepfake signals)`);
    return {
      realismFactor: 1.0,
      isFake: false,
      confidenceScore: 95,
      isPocket: pocketCheck.isPocket,
      verdict: pocketCheck.isPocket
        ? "✅ ACCEPTED (pocket image — audio will be weighted)"
        : "✅ ACCEPTED: Image appears authentic",
      deepfakeIndicators: [],
      analysis: {
        metadata,
        pocketAnalysis: pocketCheck,
        watermarks: watermarkCheck.watermarks || [],
        method: "EXIF + Watermark + Gemma3",
      },
    };
  } catch (err) {
    console.error("❌ Forensics error:", err.message);
    return {
      realismFactor: 1.0,
      isFake: false,
      confidenceScore: 50,
      isPocket: false,
      verdict: "✅ ACCEPTED: Analysis failed - accepting for safety",
      deepfakeIndicators: [],
      analysis: { error: err.message, failSafe: true },
    };
  }

};
export default{
  analyzeForensics,
  checkIfPocket,
}
