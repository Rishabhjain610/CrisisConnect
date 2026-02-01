import axios from "axios";

// ==================== EMERGENCY KEYWORDS ====================
const CRITICAL_KEYWORDS = {
  trapped: ["trapped", "stuck", "buried", "pinned"],
  help: ["help", "emergency", "911", "sos"],
  death: ["dying", "dead", "not breathing", "unconscious", "cardiac"],
  fire: ["fire", "burning", "flames", "smoke"],
  collapse: ["collapse", "collapsed", "building", "crush"],
};

const SENTIMENT_INDICATORS = {
  panic: ["help", "please", "hurry", "emergency", "now"],
  calm: ["okay", "fine", "stable", "controlled"],
};

/**
 * ==================== VISION ANALYSIS ====================
 * USES GEMMA3:4B ONLY
 * Specialized prompt to detect AI-generated vs real images
 */
export const analyzeVision = async (imageBase64) => {
  try {
    console.log("\n👀 VISION ANALYSIS (GEMMA3)...");

    const visionPrompt = `You are an expert image forensics analyst. Analyze this image CAREFULLY to determine if it's AI-generated or real.

ANALYZE FOR REAL IMAGE INDICATORS:
1. Natural imperfections: dust, scratches, motion blur, camera noise
2. Correct physics: proper shadows, realistic reflections, accurate lighting
3. Real textures: skin pores, fabric weave, natural weathering
4. Emergency context: realistic uniforms, proper equipment, natural positioning
5. Readable text: clear signage, proper spelling (AI often fails at text)
6. Complex details: intricate background elements that are hard to fake

ANALYZE FOR AI GENERATION INDICATORS:
1. Impossible anatomy: wrong number of fingers, melded limbs, asymmetrical faces
2. Physics violations: shadows pointing different directions, impossible reflections
3. Plastic-looking skin: too smooth, no pores, wax-like appearance
4. Blurry/merged details: hands blending into background, unclear text
5. Repetitive patterns: uniform texture, identical objects repeated
6. Uncanny eyes: strange pupils, unnatural gaze, mismatched sizes
7. AI artifacts: inconsistent lighting, floating objects, impossible geometry

NOW ANALYZE THIS IMAGE:

Emergency Objects to Look For: FIRE, FLAMES, SMOKE, BLOOD, INJURY, COLLAPSE, DEBRIS, WATER, FLOOD, PEOPLE IN DANGER

RESPOND ONLY WITH THIS JSON (no extra text):
{
  "is_real": true,
  "ai_confidence": 15,
  "real_confidence": 85,
  "emergency_objects": ["object1", "object2"],
  "severity": "Critical|High|Medium|Low",
  "people_count": 0,
  "real_indicators": ["indicator1", "indicator2"],
  "ai_indicators": ["none"],
  "verdict": "REAL - Clear readable text, natural lighting, proper physics",
  "reasoning": "This appears to be a real photograph because..."
}`;

    try {
      console.log("   Calling Gemma3:4b...");
      const response = await axios.post(
        "http://localhost:11434/api/generate",
        {
          model: "gemma3:4b",
          prompt: visionPrompt,
          images: [imageBase64],
          temperature: 0.0,
          stream: false,
        },
        { timeout: 70000 }
      );

      const text = response?.data?.response || "";
      console.log("   Gemma3 raw response:", text.substring(0, 400));

      let analysis = {
        is_real: true,
        ai_confidence: 0,
        real_confidence: 100,
        emergency_objects: [],
        severity: "Low",
        people_count: 0,
        real_indicators: [],
        ai_indicators: [],
        verdict: "REAL",
        reasoning: "",
      };

      // Extract JSON from response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          analysis = {
            is_real: parsed.is_real !== false,
            ai_confidence: parsed.ai_confidence || 0,
            real_confidence: parsed.real_confidence || 100,
            emergency_objects: parsed.emergency_objects || [],
            severity: parsed.severity || "Low",
            people_count: parsed.people_count || 0,
            real_indicators: parsed.real_indicators || [],
            ai_indicators: parsed.ai_indicators || [],
            verdict: parsed.verdict || "REAL",
            reasoning: parsed.reasoning || "",
          };

          console.log("✅ GEMMA3 PARSING SUCCESS");
          console.log(`   Real Confidence: ${analysis.real_confidence}%`);
          console.log(`   AI Confidence: ${analysis.ai_confidence}%`);
          console.log(`   Emergency Objects: ${analysis.emergency_objects.join(", ") || "None"}`);
          console.log(`   Verdict: ${analysis.verdict}`);

          return {
            detected: analysis.emergency_objects || [],
            emergency_detected: analysis.emergency_objects.filter(
              (obj) =>
                [
                  "fire",
                  "flames",
                  "smoke",
                  "blood",
                  "injury",
                  "collapse",
                  "debris",
                  "water",
                  "flood",
                ].some((e) => obj.toLowerCase().includes(e))
            ) || [],
            severity: analysis.severity || "Low",
            peopleCount: analysis.people_count || 0,
            confidence: analysis.real_confidence,
            isReal: analysis.is_real,
            aiConfidence: analysis.ai_confidence,
            realIndicators: analysis.real_indicators,
            aiIndicators: analysis.ai_indicators,
            verdict: analysis.verdict,
            model: "Gemma3:4b",
          };
        }
      } catch (parseErr) {
        console.log("   JSON parse failed, extracting from text...");
        const extracted = extractEmergencyFromText(text);
        return {
          detected: extracted.objects,
          emergency_detected: extracted.emergencyObjects,
          severity: extracted.severity,
          peopleCount: 0,
          confidence: 60,
          isReal: !text.toLowerCase().includes("ai generated"),
          aiConfidence: text.toLowerCase().includes("ai generated") ? 70 : 10,
          realIndicators: [],
          aiIndicators: [],
          verdict: text.toLowerCase().includes("ai generated")
            ? "AI GENERATED"
            : "REAL",
          model: "Gemma3:4b (Text Extraction)",
        };
      }
    } catch (gemmaErr) {
      console.error(`❌ Gemma3 error: ${gemmaErr.message}`);
      return {
        detected: [],
        emergency_detected: [],
        severity: "Unknown",
        peopleCount: 0,
        confidence: 0,
        isReal: true,
        aiConfidence: 0,
        realIndicators: [],
        aiIndicators: [],
        verdict: "Analysis Failed",
        model: "Error",
        error: gemmaErr.message,
      };
    }
  } catch (err) {
    console.error("❌ Vision analysis error:", err.message);
    return {
      detected: [],
      emergency_detected: [],
      severity: "Unknown",
      peopleCount: 0,
      confidence: 0,
      isReal: true,
      aiConfidence: 0,
      realIndicators: [],
      aiIndicators: [],
      verdict: "Analysis Failed",
      model: "Error",
      error: err.message,
    };
  }
};

/**
 * ==================== VOICE ANALYSIS ====================
 */
export const analyzeVoice = async (audioTranscript) => {
  try {
    console.log("\n🎤 VOICE ANALYSIS...");

    if (!audioTranscript || audioTranscript.trim().length === 0) {
      return {
        keywords: [],
        sentiment: "neutral",
        urgency: 1,
        confidence: 0,
        model: "Voice (Empty)",
      };
    }

    const voicePrompt = `Analyze this emergency call transcript and extract:
1. Critical keywords: trapped, help, fire, bleeding, dying, collapse, etc.
2. Sentiment: panic, calm, neutral
3. Urgency level: 1-10

Transcript: "${audioTranscript}"

RESPOND ONLY WITH THIS JSON:
{
  "keywords": ["keyword1", "keyword2"],
  "sentiment": "panic|calm|neutral",
  "urgency": 5
}`;

    try {
      console.log("   Attempting Groq API...");
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "gpt-oss:120b-cloud",
          messages: [{ role: "user", content: voicePrompt }],
          temperature: 0.2,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      const text = response?.data?.choices?.[0]?.message?.content || "{}";
      console.log("   Groq response:", text.substring(0, 200));

      let analysis = { keywords: [], sentiment: "neutral", urgency: 5 };

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        analysis = extractFromVoiceText(audioTranscript);
      }

      console.log("✅ GROQ SUCCESS");
      console.log(`   Keywords: ${analysis.keywords.join(", ")}`);
      console.log(`   Sentiment: ${analysis.sentiment}`);

      return {
        keywords: analysis.keywords || [],
        sentiment: analysis.sentiment || "neutral",
        urgency: analysis.urgency || 5,
        confidence: 90,
        model: "Groq",
      };
    } catch (groqErr) {
      console.log(`⚠️ Groq error (${groqErr.message}), using fallback...`);

      // LOCAL FALLBACK
      const analysis = extractFromVoiceText(audioTranscript);

      console.log("✅ LOCAL FALLBACK");
      console.log(`   Keywords: ${analysis.keywords.join(", ")}`);

      return {
        keywords: analysis.keywords || [],
        sentiment: analysis.sentiment || "neutral",
        urgency: analysis.urgency || 5,
        confidence: 50,
        model: "Local Fallback",
      };
    }
  } catch (err) {
    console.error("❌ Voice analysis error:", err.message);
    return {
      keywords: [],
      sentiment: "neutral",
      urgency: 5,
      confidence: 0,
      model: "Error",
      error: err.message,
    };
  }
};

/**
 * ==================== SEMANTIC ALIGNMENT ====================
 */
export const analyzeSemantics = (visionAnalysis, voiceAnalysis) => {
  console.log("\n🧠 SEMANTIC ALIGNMENT...");

  const visionObjects = new Set(
    (visionAnalysis.detected || []).map((o) => o.toLowerCase())
  );
  const visionEmergency = new Set(
    (visionAnalysis.emergency_detected || []).map((o) => o.toLowerCase())
  );
  const voiceKeywords = new Set(
    (voiceAnalysis.keywords || []).map((k) => k.toLowerCase())
  );

  let overlap = 0;
  const allVisionTerms = [...visionObjects, ...visionEmergency];

  for (const keyword of voiceKeywords) {
    for (const obj of allVisionTerms) {
      if (obj.includes(keyword) || keyword.includes(obj)) {
        overlap++;
      }
    }
  }

  const totalTerms = Math.max(
    visionObjects.size + visionEmergency.size,
    voiceKeywords.size,
    1
  );
  const alignmentScore = Math.min(100, (overlap / totalTerms) * 100);

  console.log(`   Vision terms: ${allVisionTerms.length}`);
  console.log(`   Voice keywords: ${voiceKeywords.size}`);
  console.log(`   Overlap: ${overlap}`);
  console.log(`   Alignment Score: ${alignmentScore.toFixed(0)}%`);

  return {
    alignmentScore,
    visionObjects: allVisionTerms,
    voiceKeywords: Array.from(voiceKeywords),
    overlap,
    model: "Custom Alignment",
  };
};

// ==================== HELPER FUNCTIONS ====================

const extractEmergencyFromText = (text) => {
  const emergencyPatterns = [
    "fire",
    "flames",
    "burning",
    "smoke",
    "blood",
    "injury",
    "trauma",
    "collapse",
    "debris",
    "weapon",
    "trapped",
    "flood",
    "water",
  ];

  const lowerText = text.toLowerCase();
  const emergencyObjects = [];
  const objects = [];

  for (const pattern of emergencyPatterns) {
    if (lowerText.includes(pattern)) {
      emergencyObjects.push(pattern);
      objects.push(pattern);
    }
  }

  let severity = "Low";
  if (
    lowerText.includes("critical") ||
    lowerText.includes("severe") ||
    emergencyObjects.length > 0
  )
    severity = "Critical";
  else if (lowerText.includes("high")) severity = "High";
  else if (lowerText.includes("medium")) severity = "Medium";

  return {
    objects: [...new Set(objects)],
    emergencyObjects: [...new Set(emergencyObjects)],
    severity,
  };
};

const extractFromVoiceText = (transcript) => {
  const lowerTranscript = transcript.toLowerCase();
  const keywords = [];
  const emergencyKeywords = [
    "trapped",
    "stuck",
    "help",
    "emergency",
    "911",
    "sos",
    "dying",
    "dead",
    "fire",
    "burning",
    "flames",
    "smoke",
    "blood",
    "injury",
    "collapse",
    "building",
    "crush",
  ];

  for (const keyword of emergencyKeywords) {
    if (lowerTranscript.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  let sentiment = "neutral";
  const panicWords = ["help", "please", "hurry", "emergency", "now", "urgent"];
  const calmWords = ["okay", "fine", "stable", "controlled"];

  let panicCount = 0,
    calmCount = 0;
  for (const word of panicWords) {
    panicCount += (lowerTranscript.match(new RegExp(word, "g")) || []).length;
  }
  for (const word of calmWords) {
    calmCount += (lowerTranscript.match(new RegExp(word, "g")) || []).length;
  }

  if (panicCount > calmCount) sentiment = "panic";
  else if (calmCount > panicCount) sentiment = "calm";

  let urgency = 5;
  if (keywords.includes("trapped") || keywords.includes("dying")) urgency = 10;
  else if (keywords.includes("fire") || keywords.includes("blood")) urgency = 8;
  else if (keywords.includes("help")) urgency = 7;
  else if (keywords.length > 0) urgency = 6;

  return {
    keywords: [...new Set(keywords)],
    sentiment,
    urgency: Math.min(10, Math.max(1, urgency)),
  };
};

export default {
  analyzeVision,
  analyzeVoice,
  analyzeSemantics,
};