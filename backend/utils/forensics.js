// import ExifParser from "exif-parser";
// import sharp from "sharp";
// import Tesseract from "tesseract.js";
// import axios from "axios";

// // ==================== DEEPFAKE KILL SWITCHES ====================
// const DEEPFAKE_KEYWORDS = {
//   photoshop: ["photoshop", "adobe photoshop", "ps", "psb"],
//   stable_diffusion: ["stable diffusion", "stablediffusion", "sd"],
//   midjourney: ["midjourney", "mj"],
//   dalle: ["dall-e", "dalle", "openai"],
//   gemini: ["gemini", "bard", "google.ai", "google ai", "imagen"],
//   firefly: ["adobe firefly", "firefly"],
//   leonardo: ["leonardo", "leonardo.ai"],
// };

// const WATERMARK_KEYWORDS = [
//   "watermark", "stock", "getty", "shutterstock", "istockphoto",
//   "adobe", "istock", "alamy", "depositphotos", "123rf",
//   "dreamstime", "fotolia", "pond5", "bigstock", "canva",
//   "unsplash", "pexels", "pixabay", "gemini", "google ai",
//   "stable diffusion", "midjourney", "dall-e", "dalle",
//   "generated", "ai generated", "created by ai"
// ];

// /**
//  * ==================== ENHANCED DEEPFAKE DETECTION WITH GEMMA3:4B ====================
//  */
// // const detectDeepfakeWithGemma = async (imageBase64) => {
// //   try {
// //     console.log("\n🔬 Advanced Deepfake Detection (Gemma3:4b)...");

// //     const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

// //     const forensicPrompt = `Analyze this image. Respond ONLY with JSON.

// // Is this image AI-GENERATED or REAL?

// // Only mark as FAKE if you see OBVIOUS AI artifacts:
// // - Hands with 6+ fingers or merged fingers
// // - Plastic/waxy skin with absolutely NO pores (like a doll)
// // - Gibberish text (squiggly lines, not real letters)
// // - Physically impossible (fire floating in air, people blended into objects)

// // Otherwise mark as REAL.

// // {
// //   "is_fake": true or false,
// //   "confidence_score": 0-100,
// //   "primary_artifact": "What you see",
// //   "ai_indicators": [],
// //   "real_indicators": []
// // }`;

// //     const response = await axios.post(
// //       "http://localhost:11434/api/generate",
// //       {
// //         model: "gemma3:4b",
// //         prompt: forensicPrompt,
// //         images: [cleanBase64],
// //         stream: false,
// //         temperature: 0.0,
// //       },
// //       { timeout: 60000 }
// //     );

// //     const responseText = response?.data?.response || "";
// //     console.log("📋 Gemma3 Response:", responseText.substring(0, 300));

// //     let analysis = {
// //       is_fake: false,
// //       confidence_score: 0,
// //       primary_artifact: "Real image (default)",
// //       ai_indicators: [],
// //       real_indicators: [],
// //     };

// //     try {
// //       const jsonMatch = responseText.match(/\{[\s\S]*\}/);
// //       if (jsonMatch) {
// //         const parsed = JSON.parse(jsonMatch[0]);
// //         analysis = { ...analysis, ...parsed };
// //       }
// //     } catch (e) {
// //       console.log("⚠️ JSON parse failed, defaulting to REAL");
// //     }

// //     const result = processForensicResult(analysis);

// //     console.log(`   Is Fake: ${analysis.is_fake}`);
// //     console.log(`   Confidence: ${analysis.confidence_score}%`);
// //     console.log(`   AI Indicators: ${analysis.ai_indicators.length}`);
// //     console.log(`   Status: ${result.status}`);

// //     return {
// //       success: true,
// //       analysis,
// //       isDeepfake: result.shouldBlock,
// //       confidence: analysis.confidence_score,
// //       status: result.status,
// //       reason: result.reason,
// //     };
// //   } catch (err) {
// //     console.error("❌ Deepfake detection error:", err.message);
// //     return {
// //       success: true,
// //       isDeepfake: false,
// //       confidence: 0,
// //       status: "VERIFIED",
// //       reason: "Analysis failed - accepting image",
// //       analysis: { is_fake: false, confidence_score: 0, primary_artifact: "Error - defaulting to real" },
// //     };
// //   }
// // };

// /**
//  * ==================== FORENSIC RESULT PROCESSING ====================
//  * 🔥 FIX: If is_fake=true AND confidence >= 85, BLOCK IT (removed indicator count requirement)
//  */
// const processForensicResult = (analysis) => {
//   const aiIndicatorCount = (analysis.ai_indicators || []).length;
//   const isFake = analysis.is_fake === true;
//   const confidence = analysis.confidence_score || 0;

//   // 🔥 FIXED: Block if EITHER condition is met:
//   // 1. is_fake=true AND confidence >= 85 (regardless of indicator count)
//   // 2. is_fake=true AND 2+ indicators (even with lower confidence)
//   if (isFake && (confidence >= 85 || aiIndicatorCount >= 2)) {
//     console.log(`   🚨 BLOCKED: Fake=${isFake}, Confidence=${confidence}, Indicators=${aiIndicatorCount}`);
//     return {
//       status: "BLOCKED",
//       reason: analysis.primary_artifact || "AI-generated image detected",
//       shouldBlock: true,
//     };
//   }

//   console.log(`   ✅ VERIFIED: Fake=${isFake}, Confidence=${confidence}, Indicators=${aiIndicatorCount}`);
//   return {
//     status: "VERIFIED",
//     reason: "Image passed forensic checks",
//     shouldBlock: false,
//   };
// };

// /**
//  * ==================== WATERMARK DETECTION ====================
//  */
// const detectWatermarks = async (imageBuffer) => {
//   try {
//     console.log("\n💧 Watermark & AI Signature Detection...");

//     const foundWatermarks = [];

//     try {
//       const worker = await Tesseract.createWorker("eng");
//       const result = await worker.recognize(imageBuffer);
//       const detectedText = result.data.text.toLowerCase();

//       console.log(`   OCR Confidence: ${result.data.confidence.toFixed(0)}%`);

//       if (detectedText.length > 20) {
//         console.log(`   Detected Text: "${detectedText.substring(0, 100)}"`);
//       }

//       await worker.terminate();

//       // Only look for CLEAR AI tool signatures
//       const aiToolKeywords = [
//         "stable diffusion", "midjourney", "dall-e", "dalle",
//         "leonardo", "gemini", "google ai"
//       ];

//       for (const keyword of aiToolKeywords) {
//         if (detectedText.includes(keyword)) {
//           foundWatermarks.push(keyword);
//           console.log(`   ✓ AI Tool Found: "${keyword}"`);
//         }
//       }
//     } catch (err) {
//       console.log("   ⚠️ OCR failed:", err.message);
//     }

//     return {
//       hasWatermark: foundWatermarks.length > 0,
//       watermarks: foundWatermarks,
//     };
//   } catch (err) {
//     console.log("⚠️ Watermark detection error:", err.message);
//     return { hasWatermark: false, watermarks: [] };
//   }
// };

// /**
//  * ==================== POCKET DETECTOR ====================
//  */
// const checkIfPocket = async (imageBuffer) => {
//   try {
//     const data = await sharp(imageBuffer)
//       .raw()
//       .toBuffer({ resolveWithObject: true });

//     const pixels = data.data;
//     let totalBrightness = 0;

//     for (let i = 0; i < pixels.length; i += 4) {
//       const r = pixels[i];
//       const g = pixels[i + 1];
//       const b = pixels[i + 2];
//       const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
//       totalBrightness += brightness;
//     }

//     const avgBrightness = totalBrightness / (pixels.length / 4) / 255;
//     const brightnessPercent = (avgBrightness * 100).toFixed(2);

//     console.log(`   Average brightness: ${brightnessPercent}%`);

//     const isPocket = avgBrightness < 0.15;

//     if (isPocket) {
//       console.log("🌑 POCKET DETECTED: Image too dark");
//     }

//     return {
//       isPocket,
//       brightnessPercent,
//       avgBrightness,
//     };
//   } catch (err) {
//     console.log("⚠️ Pocket detection error:", err.message);
//     return { isPocket: false, brightnessPercent: "0", avgBrightness: 0 };
//   }
// };

// /**
//  * ==================== MAIN FORENSICS FUNCTION ====================
//  */
// export const analyzeForensics = async (
//   imageBuffer,
//   type = "UPLOAD",
//   imageBase64 = null
// ) => {
//   try {
//     console.log("\n\n" + "=".repeat(70));
//     console.log("🔍 FORENSICS - DEEPFAKE DETECTION");
//     console.log(`Mode: ${type}`);
//     console.log("=".repeat(70));

//     // ==================== SHAKE HYBRID BYPASS ====================
//     if (type === "SHAKE_HYBRID") {
//       console.log("✅ Shake SOS detected - Trusted source");
//       const pocketCheck = await checkIfPocket(imageBuffer);

//       return {
//         realismFactor: 1.0,
//         isFake: false,
//         confidenceScore: 95,
//         isPocket: pocketCheck.isPocket,
//         verdict: pocketCheck.isPocket
//           ? "⚠️ POCKET MODE: Audio will be weighted heavily"
//           : "✅ LIVE CAPTURE: Verified",
//         deepfakeIndicators: [],
//         analysis: {
//           type: "SHAKE_HYBRID",
//           pocketAnalysis: pocketCheck,
//         },
//       };
//     }

//     // ==================== PHASE 1: EXIF METADATA CHECK ====================
//     console.log("\n📋 Phase 1: EXIF Metadata Check...");

//     let metadata = {};

//     try {
//       const parser = ExifParser.create(imageBuffer);
//       const result = parser.parse();
//       const tags = result.tags || {};

//       metadata = {
//         model: String(tags.Model || tags.Make || "Unknown"),
//         software: String(tags.Software || ""),
//       };

//       const fullText = `${metadata.software} ${metadata.model}`.toLowerCase();

//       for (const [tool, keywords] of Object.entries(DEEPFAKE_KEYWORDS)) {
//         for (const keyword of keywords) {
//           if (fullText.includes(keyword.toLowerCase())) {
//             console.log(`🚨 AI SIGNATURE IN METADATA: "${keyword}"`);
//             return {
//               realismFactor: 0.0,
//               isFake: true,
//               confidenceScore: 99,
//               isPocket: false,
//               verdict: `🚨 REJECTED: ${keyword} in metadata`,
//               deepfakeIndicators: [keyword],
//               analysis: { killSwitch: true, aiSource: tool, metadata },
//             };
//           }
//         }
//       }

//       console.log(`✅ EXIF: ${metadata.model} | ${metadata.software || "(none)"}`);
//     } catch (err) {
//       console.log("⚠️ EXIF parsing skipped");
//     }

//     // ==================== PHASE 2: WATERMARK CHECK ====================
//     console.log("\n💧 Phase 2: Watermark Detection...");
//     const watermarkCheck = await detectWatermarks(imageBuffer);

//     if (watermarkCheck.hasWatermark && watermarkCheck.watermarks.length > 0) {
//       console.log(`🚨 AI TOOL DETECTED: ${watermarkCheck.watermarks.join(", ")}`);
//       return {
//         realismFactor: 0.0,
//         isFake: true,
//         confidenceScore: 99,
//         isPocket: false,
//         verdict: `🚨 REJECTED: ${watermarkCheck.watermarks.join(", ")} detected`,
//         deepfakeIndicators: watermarkCheck.watermarks,
//         analysis: {
//           killSwitch: true,
//           aiSource: "watermark",
//           watermarks: watermarkCheck.watermarks,
//         },
//       };
//     }

//     console.log("✅ No AI tools detected in text");

//     // ==================== PHASE 3: ADVANCED DEEPFAKE DETECTION ====================
//     console.log("\n🔬 Phase 3: AI Analysis (Gemma3:4b)...");

//     let gemmaResult = { isDeepfake: false };

//     if (imageBase64) {
//       try {
//         const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
//         gemmaResult = await detectDeepfakeWithGemma(cleanBase64);

//         // 🔥 FIX: If Gemma says it's a deepfake, REJECT IT
//         if (gemmaResult.success && gemmaResult.isDeepfake) {
//           console.log(`🚨 DEEPFAKE DETECTED: ${gemmaResult.reason}`);
//           return {
//             realismFactor: 0.0,
//             isFake: true,
//             confidenceScore: Math.max(85, gemmaResult.confidence || 85),
//             isPocket: false,
//             verdict: `🚨 REJECTED: ${gemmaResult.reason}`,
//             deepfakeIndicators: [
//               gemmaResult.analysis?.primary_artifact || "Deepfake detected",
//               ...(gemmaResult.analysis?.ai_indicators || []),
//             ],
//             analysis: {
//               killSwitch: true,
//               aiSource: "gemma_forensic",
//               forensicAnalysis: gemmaResult.analysis,
//             },
//           };
//         }
//       } catch (err) {
//         console.log("⚠️ Gemma3 analysis failed:", err.message);
//       }
//     }

//     // ==================== PHASE 4: POCKET CHECK ====================
//     console.log("\n📱 Phase 4: Image Quality Check...");
//     const pocketCheck = await checkIfPocket(imageBuffer);

//     // ==================== FINAL ASSESSMENT ====================
//     console.log(`\n✅ ASSESSMENT: IMAGE ACCEPTED (no deepfake signals)`);
//     return {
//       realismFactor: 1.0,
//       isFake: false,
//       confidenceScore: 95,
//       isPocket: pocketCheck.isPocket,
//       verdict: pocketCheck.isPocket
//         ? "✅ ACCEPTED (pocket image — audio will be weighted)"
//         : "✅ ACCEPTED: Image appears authentic",
//       deepfakeIndicators: [],
//       analysis: {
//         metadata,
//         pocketAnalysis: pocketCheck,
//         watermarks: watermarkCheck.watermarks || [],
//         method: "EXIF + Watermark + Gemma3",
//       },
//     };
//   } catch (err) {
//     console.error("❌ Forensics error:", err.message);
//     return {
//       realismFactor: 1.0,
//       isFake: false,
//       confidenceScore: 50,
//       isPocket: false,
//       verdict: "✅ ACCEPTED: Analysis failed - accepting for safety",
//       deepfakeIndicators: [],
//       analysis: { error: err.message, failSafe: true },
//     };
//   }

// };
// export default{
//   analyzeForensics,
//   checkIfPocket,
// }
// import ExifParser from "exif-parser";
// import sharp from "sharp";
// import Tesseract from "tesseract.js";
// import axios from "axios";

// // ... existing keywords code ...

// /**
//  * ==================== ENHANCED DEEPFAKE DETECTION WITH GEMMA3:4B ====================
//  */
// const detectDeepfakeWithGemma = async (imageBase64) => {
//   try {
//     console.log("\n🔬 Advanced Deepfake Detection (Gemma3:4b)...");

//     const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

//     const forensicPrompt = `Analyze this image. Respond ONLY with JSON.

// Is this image AI-GENERATED or REAL?

// Only mark as FAKE if you see OBVIOUS AI artifacts:
// - Hand geometry issues
// - Unnatural skin texture
// - Gibberish text
// - Physics violations

// Otherwise mark as REAL.

// {
//   "is_fake": true or false,
//   "confidence_score": 0-100,
//   "primary_artifact": "What you see",
//   "ai_indicators": [],
//   "real_indicators": []
// }`;

//     const response = await axios.post(
//       "http://localhost:11434/api/generate",
//       {
//         model: "gemma3:4b", // As requested
//         prompt: forensicPrompt,
//         images: [cleanBase64],
//         stream: false,
//         format: "json", // Ensure JSON response
//         options: { temperature: 0.0 }
//       },
//       { timeout: 60000 }
//     );

//     const analysis = JSON.parse(response.data.response);

//     // Instead of Blocking, we flag it.
//     // If fake, we set a high confidenceScore for "fakeness"

//     console.log(`   Is Fake: ${analysis.is_fake}`);
//     console.log(`   AI Indicators: ${analysis.ai_indicators?.length || 0}`);

//     return {
//       success: true,
//       analysis,
//       isDeepfake: analysis.is_fake === true,
//       confidence: analysis.confidence_score, // Percentage chance it is FAKE
//     };
//   } catch (err) {
//     console.error("❌ Deepfake detection error:", err.message);
//     return {
//       success: false,
//       isDeepfake: false,
//       confidence: 0,
//       analysis: { is_fake: false, confidence_score: 0 },
//     };
//   }
// };

// /**
//  * ==================== MAIN FORENSICS FUNCTION ====================
//  */
// export const analyzeForensics = async (
//   imageBuffer,
//   type = "UPLOAD",
//   imageBase64 = null
// ) => {
//   try {
//     console.log("\n🔍 FORENSICS - DEEPFAKE DETECTION");

//     // Phase 1-2 & Phase 4 kept (Exif, Watermark check, Pocket check)
//     // ... (Keep existing Exif & Watermark logic here) ...
//     // NOTE: For brevity, I'm focusing on the logic change requested.

//     // Phase 3: Gemma Analysis
//     let gemmaResult = { isDeepfake: false, confidence: 0 };
//     if (imageBase64) {
//         gemmaResult = await detectDeepfakeWithGemma(imageBase64);
//     }

//     const isFake = gemmaResult.isDeepfake;

//     // 🔥 NEW LOGIC: Accept but Flag
//     // We only call it "fake" if Gemma is very sure, but even then,
//     // we return isFake=true so the TrustScore can be lowered,
//     // NOT so the controller blocks it entirely.

//     let verdict = "Verified Real";
//     if (isFake) {
//         verdict = "⚠️ Suspected AI Generated";
//     }

//     return {
//       realismFactor: isFake ? 0.2 : 1.0, // Low factor reduces trust score
//       isFake: isFake,
//       confidenceScore: gemmaResult.confidence || 0, // Confidence that it IS fake
//       isPocket: false,
//       verdict: verdict,
//       deepfakeIndicators: gemmaResult.analysis?.ai_indicators || [],
//       analysis: {
//         method: "Gemma3",
//         forensicAnalysis: gemmaResult.analysis
//       },
//     };
//   } catch (err) {
//     console.error("❌ Forensics error:", err.message);
//     return {
//         realismFactor: 1.0,
//         isFake: false,
//         confidenceScore: 0,
//         verdict: "Analysis Failed (Accepted)",
//         analysis: { error: err.message },
//     };
//   }
// };

// export default { analyzeForensics };
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
  canva: ["canva", "canva.com"],
  ai_generated: ["ai generated", "generated by ai", "artificial intelligence"],
};

const WATERMARK_KEYWORDS = [
  "watermark",
  "stock",
  "getty",
  "shutterstock",
  "istockphoto",
  "adobe",
  "istock",
  "alamy",
  "depositphotos",
  "123rf",
  "dreamstime",
  "fotolia",
  "pond5",
  "bigstock",
];

/**
 * ==================== POCKET DETECTOR ====================
 */
const checkIfPocket = async (imageBuffer) => {
  try {
    console.log("\n📱 Pocket Detection...");

    const data = await sharp(imageBuffer)
      .resize(100, 100) // Speed up analysis
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = data.data;
    let totalBrightness = 0;
    let darkPixels = 0;
    const totalPixelCount = pixels.length / 4; // RGBA

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;

      if (brightness < 30) darkPixels++; // Very dark pixels
    }

    const avgBrightness = totalBrightness / totalPixelCount / 255;
    const darkPixelRatio = darkPixels / totalPixelCount;
    const isPocket = avgBrightness < 0.15 && darkPixelRatio > 0.8;

    console.log(`   Average brightness: ${(avgBrightness * 100).toFixed(1)}%`);
    console.log(`   Dark pixels: ${(darkPixelRatio * 100).toFixed(1)}%`);
    console.log(`   Is pocket: ${isPocket}`);

    return {
      isPocket,
      avgBrightness,
      darkPixelRatio,
      brightnessPercent: (avgBrightness * 100).toFixed(1),
    };
  } catch (err) {
    console.log("⚠️ Pocket detection failed:", err.message);
    return {
      isPocket: false,
      avgBrightness: 0.5,
      darkPixelRatio: 0,
      brightnessPercent: "50",
    };
  }
};

/**
 * ==================== EXIF METADATA CHECK ====================
 */
const analyzeExifData = (imageBuffer) => {
  try {
    console.log("\n📋 EXIF Metadata Analysis...");

    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();
    const tags = result.tags || {};

    const metadata = {
      make: String(tags.Make || "Unknown"),
      model: String(tags.Model || "Unknown"),
      software: String(tags.Software || ""),
      dateTime: tags.DateTime,
      gpsLatitude: tags.GPSLatitude,
      gpsLongitude: tags.GPSLongitude,
      orientation: tags.Orientation,
      xResolution: tags.XResolution,
      yResolution: tags.YResolution,
    };

    // Check for AI generation signatures in metadata
    const suspiciousText =
      `${metadata.software} ${metadata.model} ${metadata.make}`.toLowerCase();
    let aiDetected = false;
    let aiSource = null;

    for (const [tool, keywords] of Object.entries(DEEPFAKE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (suspiciousText.includes(keyword.toLowerCase())) {
          aiDetected = true;
          aiSource = tool;
          console.log(`   🚨 AI signature detected: "${keyword}" in ${tool}`);
          break;
        }
      }
      if (aiDetected) break;
    }

    console.log(`   Make: ${metadata.make}`);
    console.log(`   Model: ${metadata.model}`);
    console.log(`   Software: ${metadata.software || "(none)"}`);
    console.log(`   AI Detected: ${aiDetected}`);

    return {
      metadata,
      aiDetected,
      aiSource,
      hasValidGPS: !!(metadata.gpsLatitude && metadata.gpsLongitude),
      hasTimestamp: !!metadata.dateTime,
    };
  } catch (err) {
    console.log("⚠️ EXIF analysis failed:", err.message);
    return {
      metadata: {},
      aiDetected: false,
      aiSource: null,
      hasValidGPS: false,
      hasTimestamp: false,
    };
  }
};

/**
 * ==================== WATERMARK/OCR DETECTION ====================
 */
const detectWatermarksAndText = async (imageBuffer) => {
  try {
    console.log("\n💧 Watermark & Text Detection...");

    // Enhance image for better OCR
    const enhancedBuffer = await sharp(imageBuffer)
      .resize(800, 600, { fit: "inside", withoutEnlargement: true })
      .sharpen()
      .normalize()
      .png()
      .toBuffer();

    const worker = await Tesseract.createWorker("eng");
    const result = await worker.recognize(enhancedBuffer);
    const detectedText = result.data.text.toLowerCase();
    await worker.terminate();

    const confidence = result.data.confidence;
    console.log(`   OCR Confidence: ${confidence.toFixed(1)}%`);
    console.log(`   Text found: ${detectedText.length > 0 ? "Yes" : "No"}`);

    if (detectedText.length > 10) {
      console.log(`   Sample text: "${detectedText.substring(0, 100)}..."`);
    }

    // Check for watermarks and AI signatures
    const foundWatermarks = [];
    const aiSignatures = [];

    for (const watermark of WATERMARK_KEYWORDS) {
      if (detectedText.includes(watermark)) {
        foundWatermarks.push(watermark);
      }
    }

    for (const [tool, keywords] of Object.entries(DEEPFAKE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (detectedText.includes(keyword)) {
          aiSignatures.push(keyword);
        }
      }
    }

    console.log(`   Watermarks found: ${foundWatermarks.length}`);
    console.log(`   AI signatures found: ${aiSignatures.length}`);

    return {
      detectedText,
      confidence,
      foundWatermarks,
      aiSignatures,
      hasText: detectedText.length > 10,
      suspiciousText: foundWatermarks.length > 0 || aiSignatures.length > 0,
    };
  } catch (err) {
    console.log("⚠️ Text detection failed:", err.message);
    return {
      detectedText: "",
      confidence: 0,
      foundWatermarks: [],
      aiSignatures: [],
      hasText: false,
      suspiciousText: false,
    };
  }
};

/**
 * ==================== AI DETECTION WITH GEMMA3:4B ====================
 */
const detectAIWithGemma = async (imageBase64) => {
  try {
    console.log("\n🔬 AI Detection (Gemma3:4b)...");

    const cleanBase64 = imageBase64.replace(
      /^data:image\/[a-zA-Z]+;base64,/,
      "",
    );

    const forensicPrompt = `
You are an expert forensic analyst. Analyze this image to determine if it's AI-generated or a real photograph.

LOOK FOR AI GENERATION SIGNS:
- Hands: Wrong number of fingers, merged fingers, unnatural hand positions
- Faces: Asymmetrical features, uncanny valley effect, plastic-looking skin
- Text: Gibberish, squiggly lines, nonsensical words or letters
- Physics: Impossible shadows, floating objects, inconsistent lighting
- Textures: Overly smooth skin, repetitive patterns, lack of natural imperfections
- Eyes: Mismatched sizes, strange pupils, unnatural gaze direction
- Background: Blurred edges, objects merging into each other

LOOK FOR REAL PHOTO SIGNS:
- Natural imperfections: skin pores, wrinkles, blemishes
- Consistent physics: proper shadows, realistic lighting
- Natural textures: fabric weave, surface roughness, wear patterns
- Clear readable text: proper fonts, correct spelling
- Natural poses and expressions
- Camera artifacts: motion blur, depth of field, noise

Be conservative - only mark as AI-generated if you see CLEAR artificial signs.

Respond with ONLY this JSON:
{
  "is_ai_generated": false,
  "confidence": 25,
  "ai_indicators": ["list of AI signs you found"],
  "real_indicators": ["list of real photo signs you found"],
  "reasoning": "Brief explanation of your decision"
}
`;

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "gemma3:4b",
        prompt: forensicPrompt,
        images: [cleanBase64],
        stream: false,
        format: "json",
        options: {
          temperature: 0.1, // Very low for consistent results
          top_p: 0.9,
        },
      },
      { timeout: 90000 },
    );

    let analysis;
    try {
      analysis = JSON.parse(response.data.response);
    } catch (parseError) {
      const responseText = response.data.response;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = {
          is_ai_generated: false,
          confidence: 10,
          ai_indicators: [],
          real_indicators: ["Analysis failed - assuming real"],
          reasoning: "Could not parse AI analysis response",
        };
      }
    }

    console.log(`   AI Generated: ${analysis.is_ai_generated}`);
    console.log(`   Confidence: ${analysis.confidence || 0}%`);
    console.log(`   AI Indicators: ${(analysis.ai_indicators || []).length}`);
    console.log(
      `   Real Indicators: ${(analysis.real_indicators || []).length}`,
    );

    return {
      isAI: analysis.is_ai_generated === true,
      confidence: Math.max(0, Math.min(100, analysis.confidence || 0)),
      aiIndicators: analysis.ai_indicators || [],
      realIndicators: analysis.real_indicators || [],
      reasoning: analysis.reasoning || "Analysis complete",
    };
  } catch (err) {
    console.error("❌ Gemma AI detection error:", err.message);
    return {
      isAI: false,
      confidence: 0,
      aiIndicators: [],
      realIndicators: ["Analysis failed - assuming real"],
      reasoning: `Error: ${err.message}`,
    };
  }
};

/**
 * ==================== MAIN FORENSICS FUNCTION ====================
 */
export const analyzeForensics = async (
  imageBuffer,
  mode = "UPLOAD",
  imageBase64 = null,
) => {
  try {
    console.log("\n\n" + "=".repeat(70));
    console.log("🔍 FORENSICS ANALYSIS PIPELINE");
    console.log(`📱 Mode: ${mode}`);
    console.log("=".repeat(70));

    // Special handling for SHAKE_HYBRID mode
    if (mode === "SHAKE_HYBRID") {
      console.log("✅ SHAKE_HYBRID mode - Trusted live capture");
      const pocketCheck = await checkIfPocket(imageBuffer);

      return {
        realismFactor: 1.0,
        isFake: false,
        confidenceScore: 5, // Very low fake confidence
        isPocket: pocketCheck.isPocket,
        verdict: pocketCheck.isPocket
          ? "📱 Live capture (pocket mode - audio priority)"
          : "📱 Live capture verified",
        deepfakeIndicators: [],
        analysis: {
          mode: "SHAKE_HYBRID",
          trusted: true,
          pocketAnalysis: pocketCheck,
        },
      };
    }

    // Phase 1: EXIF Metadata Analysis
    const exifAnalysis = analyzeExifData(imageBuffer);

    // If clear AI signature in metadata, flag but don't block
    if (exifAnalysis.aiDetected) {
      console.log("🚨 AI signature found in EXIF metadata");
      return {
        realismFactor: 0.1, // Very low but not zero
        isFake: true,
        confidenceScore: 95,
        isPocket: false,
        verdict: `⚠️ AI signature detected: ${exifAnalysis.aiSource}`,
        deepfakeIndicators: [`EXIF: ${exifAnalysis.aiSource}`],
        analysis: {
          method: "EXIF_DETECTION",
          exifData: exifAnalysis,
          aiSource: exifAnalysis.aiSource,
        },
      };
    }

    // Phase 2: Basic image quality checks
    const pocketCheck = await checkIfPocket(imageBuffer);

    // Phase 3: Watermark and text detection
    const textAnalysis = await detectWatermarksAndText(imageBuffer);

    // If AI signatures found in text, flag but don't block
    if (textAnalysis.suspiciousText && textAnalysis.aiSignatures.length > 0) {
      console.log("🚨 AI signatures found in image text");
      return {
        realismFactor: 0.2,
        isFake: true,
        confidenceScore: 90,
        isPocket: pocketCheck.isPocket,
        verdict: `⚠️ AI signatures in text: ${textAnalysis.aiSignatures.join(", ")}`,
        deepfakeIndicators: textAnalysis.aiSignatures,
        analysis: {
          method: "TEXT_DETECTION",
          textAnalysis: textAnalysis,
          pocketAnalysis: pocketCheck,
        },
      };
    }

    // Phase 4: Advanced AI detection with Gemma
    let aiAnalysis = { isAI: false, confidence: 0 };
    if (imageBase64) {
      aiAnalysis = await detectAIWithGemma(imageBase64);
    }

    // Determine final verdict
    const isLikelyFake = aiAnalysis.isAI && aiAnalysis.confidence > 60;

    let verdict, realismFactor, confidenceScore;

    if (isLikelyFake) {
      verdict = `⚠️ Suspected AI-generated (${aiAnalysis.confidence}% confidence)`;
      realismFactor = Math.max(0.1, 1.0 - aiAnalysis.confidence / 100); // Scale from 0.1 to 0.4
      confidenceScore = aiAnalysis.confidence;
      console.log(
        "🚨 Image flagged as likely AI-generated (low trust score applied)",
      );
    } else {
      verdict = "✅ Appears to be real photograph";
      realismFactor = 1.0;
      confidenceScore = Math.max(0, 100 - aiAnalysis.confidence);
      console.log("✅ Image appears authentic");
    }

    return {
      realismFactor: realismFactor,
      isFake: isLikelyFake,
      confidenceScore: aiAnalysis.confidence || 0,
      isPocket: pocketCheck.isPocket,
      verdict: verdict,
      deepfakeIndicators: isLikelyFake ? aiAnalysis.aiIndicators : [],
      analysis: {
        method: "COMPREHENSIVE",
        exifData: exifAnalysis.metadata,
        pocketAnalysis: pocketCheck,
        textAnalysis: {
          hasText: textAnalysis.hasText,
          confidence: textAnalysis.confidence,
          watermarksFound: textAnalysis.foundWatermarks.length,
        },
        aiAnalysis: {
          model: "gemma3:4b",
          confidence: aiAnalysis.confidence,
          aiIndicatorCount: aiAnalysis.aiIndicators.length,
          realIndicatorCount: aiAnalysis.realIndicators.length,
          reasoning: aiAnalysis.reasoning,
        },
      },
    };
  } catch (err) {
    console.error("❌ Forensics pipeline error:", err.message);

    // Fail-safe: Accept image with warning
    return {
      realismFactor: 0.8, // Slightly reduced due to analysis failure
      isFake: false,
      confidenceScore: 10,
      isPocket: false,
      verdict: "⚠️ Analysis failed - accepted with caution",
      deepfakeIndicators: ["Analysis error"],
      analysis: {
        method: "FAILED",
        error: err.message,
        failsafe: true,
      },
    };
  }
};

export default {
  analyzeForensics,
  checkIfPocket,
  analyzeExifData,
  detectWatermarksAndText,
  detectAIWithGemma,
};
