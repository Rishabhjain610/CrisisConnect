// import axios from "axios";

// // ==================== EMERGENCY KEYWORDS ====================
// const CRITICAL_KEYWORDS = {
//   trapped: ["trapped", "stuck", "buried", "pinned"],
//   help: ["help", "emergency", "911", "sos"],
//   death: ["dying", "dead", "not breathing", "unconscious", "cardiac"],
//   fire: ["fire", "burning", "flames", "smoke"],
//   collapse: ["collapse", "collapsed", "building", "crush"],
// };

// const SENTIMENT_INDICATORS = {
//   panic: ["help", "please", "hurry", "emergency", "now"],
//   calm: ["okay", "fine", "stable", "controlled"],
// };

// /**
//  * ==================== VISION ANALYSIS ====================
//  * USES GEMMA3:4B ONLY
//  * Specialized prompt to detect AI-generated vs real images
//  */
// export const analyzeVision = async (imageBase64) => {
//   try {
//     console.log("\n👀 VISION ANALYSIS (GEMMA3)...");

//     const visionPrompt = `You are an expert image forensics analyst. Analyze this image CAREFULLY to determine if it's AI-generated or real.

// ANALYZE FOR REAL IMAGE INDICATORS:
// 1. Natural imperfections: dust, scratches, motion blur, camera noise
// 2. Correct physics: proper shadows, realistic reflections, accurate lighting
// 3. Real textures: skin pores, fabric weave, natural weathering
// 4. Emergency context: realistic uniforms, proper equipment, natural positioning
// 5. Readable text: clear signage, proper spelling (AI often fails at text)
// 6. Complex details: intricate background elements that are hard to fake

// ANALYZE FOR AI GENERATION INDICATORS:
// 1. Impossible anatomy: wrong number of fingers, melded limbs, asymmetrical faces
// 2. Physics violations: shadows pointing different directions, impossible reflections
// 3. Plastic-looking skin: too smooth, no pores, wax-like appearance
// 4. Blurry/merged details: hands blending into background, unclear text
// 5. Repetitive patterns: uniform texture, identical objects repeated
// 6. Uncanny eyes: strange pupils, unnatural gaze, mismatched sizes
// 7. AI artifacts: inconsistent lighting, floating objects, impossible geometry

// NOW ANALYZE THIS IMAGE:

// Emergency Objects to Look For: FIRE, FLAMES, SMOKE, BLOOD, INJURY, COLLAPSE, DEBRIS, WATER, FLOOD, PEOPLE IN DANGER

// RESPOND ONLY WITH THIS JSON (no extra text):
// {
//   "is_real": true,
//   "ai_confidence": 15,
//   "real_confidence": 85,
//   "emergency_objects": ["object1", "object2"],
//   "severity": "Critical|High|Medium|Low",
//   "people_count": 0,
//   "real_indicators": ["indicator1", "indicator2"],
//   "ai_indicators": ["none"],
//   "verdict": "REAL - Clear readable text, natural lighting, proper physics",
//   "reasoning": "This appears to be a real photograph because..."
// }`;

//     try {
//       console.log("   Calling Gemma3:4b...");
//       const response = await axios.post(
//         "http://localhost:11434/api/generate",
//         {
//           model: "gemma3:4b",
//           prompt: visionPrompt,
//           images: [imageBase64],
//           temperature: 0.0,
//           stream: false,
//         },
//         { timeout: 70000 }
//       );

//       const text = response?.data?.response || "";
//       console.log("   Gemma3 raw response:", text.substring(0, 400));

//       let analysis = {
//         is_real: true,
//         ai_confidence: 0,
//         real_confidence: 100,
//         emergency_objects: [],
//         severity: "Low",
//         people_count: 0,
//         real_indicators: [],
//         ai_indicators: [],
//         verdict: "REAL",
//         reasoning: "",
//       };

//       // Extract JSON from response
//       try {
//         const jsonMatch = text.match(/\{[\s\S]*\}/);
//         if (jsonMatch) {
//           const parsed = JSON.parse(jsonMatch[0]);
//           analysis = {
//             is_real: parsed.is_real !== false,
//             ai_confidence: parsed.ai_confidence || 0,
//             real_confidence: parsed.real_confidence || 100,
//             emergency_objects: parsed.emergency_objects || [],
//             severity: parsed.severity || "Low",
//             people_count: parsed.people_count || 0,
//             real_indicators: parsed.real_indicators || [],
//             ai_indicators: parsed.ai_indicators || [],
//             verdict: parsed.verdict || "REAL",
//             reasoning: parsed.reasoning || "",
//           };

//           console.log("✅ GEMMA3 PARSING SUCCESS");
//           console.log(`   Real Confidence: ${analysis.real_confidence}%`);
//           console.log(`   AI Confidence: ${analysis.ai_confidence}%`);
//           console.log(`   Emergency Objects: ${analysis.emergency_objects.join(", ") || "None"}`);
//           console.log(`   Verdict: ${analysis.verdict}`);

//           return {
//             detected: analysis.emergency_objects || [],
//             emergency_detected: analysis.emergency_objects.filter(
//               (obj) =>
//                 [
//                   "fire",
//                   "flames",
//                   "smoke",
//                   "blood",
//                   "injury",
//                   "collapse",
//                   "debris",
//                   "water",
//                   "flood",
//                 ].some((e) => obj.toLowerCase().includes(e))
//             ) || [],
//             severity: analysis.severity || "Low",
//             peopleCount: analysis.people_count || 0,
//             confidence: analysis.real_confidence,
//             isReal: analysis.is_real,
//             aiConfidence: analysis.ai_confidence,
//             realIndicators: analysis.real_indicators,
//             aiIndicators: analysis.ai_indicators,
//             verdict: analysis.verdict,
//             model: "Gemma3:4b",
//           };
//         }
//       } catch (parseErr) {
//         console.log("   JSON parse failed, extracting from text...");
//         const extracted = extractEmergencyFromText(text);
//         return {
//           detected: extracted.objects,
//           emergency_detected: extracted.emergencyObjects,
//           severity: extracted.severity,
//           peopleCount: 0,
//           confidence: 60,
//           isReal: !text.toLowerCase().includes("ai generated"),
//           aiConfidence: text.toLowerCase().includes("ai generated") ? 70 : 10,
//           realIndicators: [],
//           aiIndicators: [],
//           verdict: text.toLowerCase().includes("ai generated")
//             ? "AI GENERATED"
//             : "REAL",
//           model: "Gemma3:4b (Text Extraction)",
//         };
//       }
//     } catch (gemmaErr) {
//       console.error(`❌ Gemma3 error: ${gemmaErr.message}`);
//       return {
//         detected: [],
//         emergency_detected: [],
//         severity: "Unknown",
//         peopleCount: 0,
//         confidence: 0,
//         isReal: true,
//         aiConfidence: 0,
//         realIndicators: [],
//         aiIndicators: [],
//         verdict: "Analysis Failed",
//         model: "Error",
//         error: gemmaErr.message,
//       };
//     }
//   } catch (err) {
//     console.error("❌ Vision analysis error:", err.message);
//     return {
//       detected: [],
//       emergency_detected: [],
//       severity: "Unknown",
//       peopleCount: 0,
//       confidence: 0,
//       isReal: true,
//       aiConfidence: 0,
//       realIndicators: [],
//       aiIndicators: [],
//       verdict: "Analysis Failed",
//       model: "Error",
//       error: err.message,
//     };
//   }
// };

// /**
//  * ==================== VOICE ANALYSIS ====================
//  */
// export const analyzeVoice = async (audioTranscript) => {
//   try {
//     console.log("\n🎤 VOICE ANALYSIS...");

//     if (!audioTranscript || audioTranscript.trim().length === 0) {
//       return {
//         keywords: [],
//         sentiment: "neutral",
//         urgency: 1,
//         confidence: 0,
//         model: "Voice (Empty)",
//       };
//     }

//     const voicePrompt = `Analyze this emergency call transcript and extract:
// 1. Critical keywords: trapped, help, fire, bleeding, dying, collapse, etc.
// 2. Sentiment: panic, calm, neutral
// 3. Urgency level: 1-10

// Transcript: "${audioTranscript}"

// RESPOND ONLY WITH THIS JSON:
// {
//   "keywords": ["keyword1", "keyword2"],
//   "sentiment": "panic|calm|neutral",
//   "urgency": 5
// }`;

//     try {
//       console.log("   Attempting Groq API...");
//       const response = await axios.post(
//         "https://api.groq.com/openai/v1/chat/completions",
//         {
//           model: "gpt-oss:120b-cloud",
//           messages: [{ role: "user", content: voicePrompt }],
//           temperature: 0.2,
//           max_tokens: 500,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//           timeout: 20000,
//         }
//       );

//       const text = response?.data?.choices?.[0]?.message?.content || "{}";
//       console.log("   Groq response:", text.substring(0, 200));

//       let analysis = { keywords: [], sentiment: "neutral", urgency: 5 };

//       try {
//         const jsonMatch = text.match(/\{[\s\S]*\}/);
//         if (jsonMatch) {
//           analysis = JSON.parse(jsonMatch[0]);
//         }
//       } catch (e) {
//         analysis = extractFromVoiceText(audioTranscript);
//       }

//       console.log("✅ GROQ SUCCESS");
//       console.log(`   Keywords: ${analysis.keywords.join(", ")}`);
//       console.log(`   Sentiment: ${analysis.sentiment}`);

//       return {
//         keywords: analysis.keywords || [],
//         sentiment: analysis.sentiment || "neutral",
//         urgency: analysis.urgency || 5,
//         confidence: 90,
//         model: "Groq",
//       };
//     } catch (groqErr) {
//       console.log(`⚠️ Groq error (${groqErr.message}), using fallback...`);

//       // LOCAL FALLBACK
//       const analysis = extractFromVoiceText(audioTranscript);

//       console.log("✅ LOCAL FALLBACK");
//       console.log(`   Keywords: ${analysis.keywords.join(", ")}`);

//       return {
//         keywords: analysis.keywords || [],
//         sentiment: analysis.sentiment || "neutral",
//         urgency: analysis.urgency || 5,
//         confidence: 50,
//         model: "Local Fallback",
//       };
//     }
//   } catch (err) {
//     console.error("❌ Voice analysis error:", err.message);
//     return {
//       keywords: [],
//       sentiment: "neutral",
//       urgency: 5,
//       confidence: 0,
//       model: "Error",
//       error: err.message,
//     };
//   }
// };

// /**
//  * ==================== SEMANTIC ALIGNMENT ====================
//  */
// export const analyzeSemantics = (visionAnalysis, voiceAnalysis) => {
//   console.log("\n🧠 SEMANTIC ALIGNMENT...");

//   const visionObjects = new Set(
//     (visionAnalysis.detected || []).map((o) => o.toLowerCase())
//   );
//   const visionEmergency = new Set(
//     (visionAnalysis.emergency_detected || []).map((o) => o.toLowerCase())
//   );
//   const voiceKeywords = new Set(
//     (voiceAnalysis.keywords || []).map((k) => k.toLowerCase())
//   );

//   let overlap = 0;
//   const allVisionTerms = [...visionObjects, ...visionEmergency];

//   for (const keyword of voiceKeywords) {
//     for (const obj of allVisionTerms) {
//       if (obj.includes(keyword) || keyword.includes(obj)) {
//         overlap++;
//       }
//     }
//   }

//   const totalTerms = Math.max(
//     visionObjects.size + visionEmergency.size,
//     voiceKeywords.size,
//     1
//   );
//   const alignmentScore = Math.min(100, (overlap / totalTerms) * 100);

//   console.log(`   Vision terms: ${allVisionTerms.length}`);
//   console.log(`   Voice keywords: ${voiceKeywords.size}`);
//   console.log(`   Overlap: ${overlap}`);
//   console.log(`   Alignment Score: ${alignmentScore.toFixed(0)}%`);

//   return {
//     alignmentScore,
//     visionObjects: allVisionTerms,
//     voiceKeywords: Array.from(voiceKeywords),
//     overlap,
//     model: "Custom Alignment",
//   };
// };

// // ==================== HELPER FUNCTIONS ====================

// const extractEmergencyFromText = (text) => {
//   const emergencyPatterns = [
//     "fire",
//     "flames",
//     "burning",
//     "smoke",
//     "blood",
//     "injury",
//     "trauma",
//     "collapse",
//     "debris",
//     "weapon",
//     "trapped",
//     "flood",
//     "water",
//   ];

//   const lowerText = text.toLowerCase();
//   const emergencyObjects = [];
//   const objects = [];

//   for (const pattern of emergencyPatterns) {
//     if (lowerText.includes(pattern)) {
//       emergencyObjects.push(pattern);
//       objects.push(pattern);
//     }
//   }

//   let severity = "Low";
//   if (
//     lowerText.includes("critical") ||
//     lowerText.includes("severe") ||
//     emergencyObjects.length > 0
//   )
//     severity = "Critical";
//   else if (lowerText.includes("high")) severity = "High";
//   else if (lowerText.includes("medium")) severity = "Medium";

//   return {
//     objects: [...new Set(objects)],
//     emergencyObjects: [...new Set(emergencyObjects)],
//     severity,
//   };
// };

// const extractFromVoiceText = (transcript) => {
//   const lowerTranscript = transcript.toLowerCase();
//   const keywords = [];
//   const emergencyKeywords = [
//     "trapped",
//     "stuck",
//     "help",
//     "emergency",
//     "911",
//     "sos",
//     "dying",
//     "dead",
//     "fire",
//     "burning",
//     "flames",
//     "smoke",
//     "blood",
//     "injury",
//     "collapse",
//     "building",
//     "crush",
//   ];

//   for (const keyword of emergencyKeywords) {
//     if (lowerTranscript.includes(keyword)) {
//       keywords.push(keyword);
//     }
//   }

//   let sentiment = "neutral";
//   const panicWords = ["help", "please", "hurry", "emergency", "now", "urgent"];
//   const calmWords = ["okay", "fine", "stable", "controlled"];

//   let panicCount = 0,
//     calmCount = 0;
//   for (const word of panicWords) {
//     panicCount += (lowerTranscript.match(new RegExp(word, "g")) || []).length;
//   }
//   for (const word of calmWords) {
//     calmCount += (lowerTranscript.match(new RegExp(word, "g")) || []).length;
//   }

//   if (panicCount > calmCount) sentiment = "panic";
//   else if (calmCount > panicCount) sentiment = "calm";

//   let urgency = 5;
//   if (keywords.includes("trapped") || keywords.includes("dying")) urgency = 10;
//   else if (keywords.includes("fire") || keywords.includes("blood")) urgency = 8;
//   else if (keywords.includes("help")) urgency = 7;
//   else if (keywords.length > 0) urgency = 6;

//   return {
//     keywords: [...new Set(keywords)],
//     sentiment,
//     urgency: Math.min(10, Math.max(1, urgency)),
//   };
// };

// export default {
//   analyzeVision,
//   analyzeVoice,
//   analyzeSemantics,
// };
//  import axios from "axios";

// const OLLAMA_URL = "http://localhost:11434/api/generate";
// const TEXT_MODEL = "gpt-oss:120b-cloud"; // As requested
// const VISION_MODEL = "gemma3:4b"; // As requested

// /**
//  * ==================== TEXT INTELLIGENCE (Translation + Type) ====================
//  * Analyzes raw transcript/description to detecting Type and Translate to English
//  */
// export const processTextIntelligence = async (text) => {
//   if (!text || text.trim().length === 0) {
//     return { translatedText: "", detectedType: "Other" };
//   }

//   const prompt = `
//     Task: Emergency Incident Classification.
//     Input Text: "${text}"

//     Steps:
//     1. Translate the input text to English (if it is not already).
//     2. Categorize the incident into exactly ONE of these types: "Fire", "Flood", "Medical", "Accident", "Infrastructure", "Other".

//     Return JSON only:
//     {
//       "translatedText": "The english translation here",
//       "detectedType": "The Category"
//     }
//   `;

//   try {
//     console.log(`\n🧠 Processing Text Intelligence (${TEXT_MODEL})...`);

//     const response = await axios.post(OLLAMA_URL, {
//       model: TEXT_MODEL,
//       prompt: prompt,
//       stream: false,
//       format: "json",
//       options: { temperature: 0.1 }
//     });

//     const result = JSON.parse(response.data.response);
//     console.log(`   ✅ Translation: "${result.translatedText}"`);
//     console.log(`   ✅ Type: ${result.detectedType}`);

//     return result;
//   } catch (err) {
//     console.error("⚠️ Text Intelligence Error:", err.message);
//     // Fallback
//     return { translatedText: text, detectedType: "Other" };
//   }
// };

// /**
//  * ==================== VISION ANALYSIS ====================
//  * Uses gemma3:4b as requested
//  */
// export const analyzeVision = async (imageBase64) => {
//   try {
//     console.log(`\n👀 VISION ANALYSIS (${VISION_MODEL})...`);

//     const visionPrompt = `
//       Analyze this emergency image.
//       Identify if there are any: Fire, Smoke, Blood, Injuries, Weapons, Collapsed Buildings, Floods, or People in danger.
//       Determine if the image is REAL or AI-GENERATED.

//       Respond JSON only:
//       {
//         "is_real": true,
//         "emergency_detected": ["fire", "blood"],
//         "severity": "High",
//         "verdict": "Real image of a fire",
//         "ai_confidence": 0
//       }
//     `;

//     const response = await axios.post(OLLAMA_URL, {
//         model: VISION_MODEL,
//         prompt: visionPrompt,
//         images: [imageBase64],
//         stream: false,
//         format: "json",
//         options: { temperature: 0 }
//       },
//       { timeout: 90000 } // Higher timeout for vision
//     );

//     const json = JSON.parse(response.data.response);

//     return {
//       detected: json.emergency_detected || [],
//       emergency_detected: json.emergency_detected || [],
//       severity: json.severity || "Unknown",
//       isReal: json.is_real !== false,
//       aiConfidence: json.ai_confidence || 0,
//       verdict: json.verdict || "Analyzed",
//       model: VISION_MODEL
//     };

//   } catch (err) {
//     console.error("❌ Vision analysis error:", err.message);
//     return {
//       emergency_detected: [],
//       severity: "Unknown",
//       isReal: true,
//       aiConfidence: 0,
//       model: "Error"
//     };
//   }
// };

// /**
//  * ==================== VOICE ANALYSIS ====================
//  * Uses gpt-oss:120b-cloud for extraction
//  */
// export const analyzeVoice = async (audioTranscript) => {
//   try {
//     console.log(`\n🎤 VOICE ANALYSIS (${TEXT_MODEL})...`);

//     if (!audioTranscript || audioTranscript.trim().length === 0) {
//       return { keywords: [], sentiment: "neutral", urgency: 1 };
//     }

//     const prompt = `
//       Analyze this emergency transcript: "${audioTranscript}"

//       Extract:
//       1. Keywords (e.g., trapped, fire, bleeding, help)
//       2. Sentiment (panic, calm, neutral)
//       3. Urgency (1-10)

//       Return JSON only:
//       { "keywords": [], "sentiment": "", "urgency": 5 }
//     `;

//     const response = await axios.post(OLLAMA_URL, {
//       model: TEXT_MODEL,
//       prompt: prompt,
//       stream: false,
//       format: "json"
//     });

//     const analysis = JSON.parse(response.data.response);
//     console.log(`   ✅ Keywords: ${analysis.keywords?.join(", ")}`);

//     return {
//       keywords: analysis.keywords || [],
//       sentiment: analysis.sentiment || "neutral",
//       urgency: analysis.urgency || 5,
//       model: TEXT_MODEL
//     };

//   } catch (err) {
//     console.error("❌ Voice analysis error:", err.message);
//     return { keywords: [], sentiment: "neutral", urgency: 5, model: "Error" };
//   }
// };

// /**
//  * ==================== SEMANTIC ALIGNMENT ====================
//  */
// export const analyzeSemantics = (visionAnalysis, voiceAnalysis) => {
//   // Simple intersection logic (keeping existing reliable logic)
//   const vision = new Set((visionAnalysis.emergency_detected || []).map(x => x.toLowerCase()));
//   const voice = new Set((voiceAnalysis.keywords || []).map(x => x.toLowerCase()));

//   let overlap = 0;
//   voice.forEach(v => {
//       [...vision].forEach(vis => {
//           if (vis.includes(v) || v.includes(vis)) overlap++;
//       });
//   });

//   const score = Math.min(100, (overlap > 0 ? 50 + (overlap * 25) : 50));
//   return { alignmentScore: score };
// };

// export default {
//   analyzeVision,
//   analyzeVoice,
//   analyzeSemantics,
//   processTextIntelligence
// };
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