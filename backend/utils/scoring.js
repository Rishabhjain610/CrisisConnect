import Incident from "../models/incident.model.js";

/**
 * ==================== LOCATION CONSENSUS ====================
 */
const calculateLocationConsensus = async (latitude, longitude) => {
  try {
    console.log("\n📍 Location Consensus Check...");

    const radiusMeters = 500;
    const earthRadiusMeters = 6378137;
    const radiusInRadians = radiusMeters / earthRadiusMeters;

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const nearbyCount = await Incident.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [
            [Number(longitude), Number(latitude)],
            radiusInRadians,
          ],
        },
      },
      createdAt: { $gte: fifteenMinutesAgo },
      status: { $in: ["Pending", "Active"] },
    });

    console.log(`   Nearby incidents (15 min): ${nearbyCount}`);

    let consensusScore = 0;
    if (nearbyCount >= 3) consensusScore = 100;
    else if (nearbyCount >= 1) consensusScore = 50;
    else consensusScore = 0;

    return {
      nearbyIncidents: nearbyCount,
      score: consensusScore,
    };
  } catch (err) {
    console.error("Location consensus error:", err.message);
    return { nearbyIncidents: 0, score: 0 };
  }
};

/**
 * ==================== FORMULA A: IMAGE + TEXT MODE ====================
 */
export const scoreFormulaA = async (
  forensics,
  visionAnalysis,
  semantics,
  locationConsensus,
) => {
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 FORMULA A: IMAGE + TEXT MODE");
  console.log("=".repeat(60));

  // If forensics rejected the image, score is 0
  if (forensics.isFake) {
    console.log("🚨 Image rejected by forensics - Score: 0");
    return {
      formula: "FORMULA_A",
      totalScore: 0,
      breakdown: {
        visual: 0,
        alignment: 0,
        consensus: 0,
        realismFactor: forensics.realismFactor,
      },
    };
  }

  let visualScore = 0;

  // ✅ CHECK EMERGENCY OBJECTS FIRST
  const emergencyDetected = (visionAnalysis.emergency_detected || []).map((o) =>
    o.toLowerCase(),
  );

  console.log(
    `\n🔴 Emergency objects detected: [${emergencyDetected.join(", ")}]`,
  );

  if (emergencyDetected.length > 0) {
    // Check for FIRE specifically
    const hasFire = emergencyDetected.some((o) =>
      ["fire", "flames", "burning", "smoke"].some((e) => o.includes(e)),
    );
    const hasBlood = emergencyDetected.some((o) =>
      ["blood", "injury", "trauma"].some((e) => o.includes(e)),
    );
    const hasCollapse = emergencyDetected.some((o) =>
      ["collapse", "debris", "building"].some((e) => o.includes(e)),
    );

    if (hasFire) {
      visualScore = 90;
      console.log("🔴 🔥 FIRE DETECTED: Score = 90");
    } else if (hasBlood) {
      visualScore = 85;
      console.log("🔴 🩸 BLOOD/INJURY DETECTED: Score = 85");
    } else if (hasCollapse) {
      visualScore = 88;
      console.log("🔴 🏚️ COLLAPSE DETECTED: Score = 88");
    } else {
      visualScore = 70;
      console.log("🟡 Other emergency detected: Score = 70");
    }
  } else if (visionAnalysis.severity === "Critical") {
    visualScore = 80;
    console.log("Severity Critical: Score = 80");
  } else if (visionAnalysis.severity === "High") {
    visualScore = 60;
    console.log("Severity High: Score = 60");
  } else {
    visualScore = 20;
    console.log("Severity Low/Unknown: Score = 20");
  }

  console.log(`Final Visual Score: ${visualScore}`);

  const alignmentScore = semantics.alignmentScore || 50;
  console.log(`Alignment Score: ${alignmentScore}`);

  const preRealismScore = visualScore * 0.5 + alignmentScore * 0.2;
  const realismAdjusted = preRealismScore * forensics.realismFactor;
  const consensusBoost = locationConsensus.score * 0.3;
  const totalScore = realismAdjusted + consensusBoost;

  console.log(`TOTAL SCORE: ${Math.min(100, totalScore).toFixed(0)}`);

  return {
    formula: "FORMULA_A",
    totalScore: Math.min(100, totalScore),
    breakdown: {
      visual: visualScore,
      alignment: alignmentScore,
      consensus: locationConsensus.score,
      realismFactor: forensics.realismFactor,
      emergencyDetected,
    },
  };
};

/**
 * ==================== FORMULA B: VOICE SOS MODE ====================
 */
export const scoreFormulaB = async (voiceAnalysis, locationConsensus) => {
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 FORMULA B: VOICE SOS MODE");
  console.log("=".repeat(60));

  let keywordsScore = 0;
  const CRITICAL_KEYWORDS = {
    trapped: 100,
    help: 80,
    death: 100,
    fire: 90,
    collapse: 100,
  };

  const foundKeywords = voiceAnalysis.keywords || [];
  for (const keyword of foundKeywords) {
    const keywordLower = keyword.toLowerCase();
    for (const [critical, score] of Object.entries(CRITICAL_KEYWORDS)) {
      if (keywordLower.includes(critical)) {
        keywordsScore = Math.max(keywordsScore, score);
      }
    }
  }

  if (keywordsScore === 0) {
    keywordsScore = voiceAnalysis.urgency * 10;
  }

  console.log(`Keywords Score: ${Math.min(100, keywordsScore)}`);

  let sentimentScore = 0;
  if (voiceAnalysis.sentiment === "panic") {
    sentimentScore = 90;
  } else if (voiceAnalysis.sentiment === "calm") {
    sentimentScore = 30;
  } else {
    sentimentScore = 50;
  }

  console.log(`Sentiment Score: ${sentimentScore}`);

  const totalScore =
    Math.min(100, keywordsScore) * 0.4 +
    sentimentScore * 0.2 +
    locationConsensus.score * 0.4;

  console.log(`TOTAL SCORE: ${Math.min(100, totalScore).toFixed(0)}`);

  return {
    formula: "FORMULA_B",
    totalScore: Math.min(100, totalScore),
    breakdown: {
      keywords: Math.min(100, keywordsScore),
      sentiment: sentimentScore,
      consensus: locationConsensus.score,
    },
  };
};

/**
 * ==================== FORMULA C: HYBRID SHAKE MODE ====================
 */
export const scoreFormulaC = async (
  forensics,
  visionAnalysis,
  voiceAnalysis,
  locationConsensus,
) => {
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 FORMULA C: HYBRID SHAKE MODE");
  console.log("=".repeat(60));

  const isPocket = forensics.isPocket;
  console.log(`Pocket mode: ${isPocket}`);

  let visualScore = 0;
  if (!isPocket) {
    const emergencyDetected = (visionAnalysis.emergency_detected || []).map(
      (o) => o.toLowerCase(),
    );

    if (emergencyDetected.length > 0) {
      if (
        emergencyDetected.some((o) =>
          ["fire", "flames", "burning", "smoke"].some((e) => o.includes(e)),
        )
      ) {
        visualScore = 90;
      } else if (
        emergencyDetected.some((o) =>
          ["blood", "injury", "trauma"].some((e) => o.includes(e)),
        )
      ) {
        visualScore = 85;
      } else {
        visualScore = 60;
      }
    } else {
      visualScore = 20;
    }
  } else {
    console.log("   Ignoring dark image (pocket mode)");
  }

  let audioScore = 0;
  const CRITICAL_KEYWORDS = {
    trapped: 100,
    help: 80,
    death: 100,
    fire: 90,
    collapse: 100,
  };

  const foundKeywords = voiceAnalysis.keywords || [];
  for (const keyword of foundKeywords) {
    const keywordLower = keyword.toLowerCase();
    for (const [critical, score] of Object.entries(CRITICAL_KEYWORDS)) {
      if (keywordLower.includes(critical)) {
        audioScore = Math.max(audioScore, score);
      }
    }
  }

  if (audioScore === 0) {
    audioScore = voiceAnalysis.urgency * 10;
  }

  console.log(`Visual Score: ${visualScore}`);
  console.log(`Audio Score: ${Math.min(100, audioScore)}`);

  const weights = isPocket
    ? { visual: 0.0, audio: 0.7, consensus: 0.3 }
    : { visual: 0.3, audio: 0.4, consensus: 0.3 };

  const totalScore =
    visualScore * weights.visual +
    Math.min(100, audioScore) * weights.audio +
    locationConsensus.score * weights.consensus;

  console.log(`TOTAL SCORE: ${Math.min(100, totalScore).toFixed(0)}`);

  return {
    formula: "FORMULA_C",
    totalScore: Math.min(100, totalScore),
    breakdown: {
      visual: visualScore * weights.visual,
      audio: Math.min(100, audioScore) * weights.audio,
      consensus: locationConsensus.score * weights.consensus,
    },
    isPocket,
  };
};

/**
 * ==================== MASTER SCORING FUNCTION ====================
 * THIS IS THE MAIN EXPORT THAT incident.controller.js USES
 */
export const calculateTrustScore = async (
  mode,
  forensics,
  visionAnalysis,
  voiceAnalysis,
  semantics,
  latitude,
  longitude,
) => {
  console.log("\n\n" + "█".repeat(70));
  console.log("█  PHASE 4: SCORING ENGINE");
  console.log("█".repeat(70));

  const locationConsensus = await calculateLocationConsensus(
    latitude,
    longitude,
  );

  let scoreResult;

  if (mode === "SHAKE_HYBRID") {
    scoreResult = await scoreFormulaC(
      forensics,
      visionAnalysis,
      voiceAnalysis,
      locationConsensus,
    );
  } else if (mode === "VOICE") {
    scoreResult = await scoreFormulaB(voiceAnalysis, locationConsensus);
  } else {
    // IMAGE_TEXT
    scoreResult = await scoreFormulaA(
      forensics,
      visionAnalysis,
      semantics,
      locationConsensus,
    );
  }

  return {
    ...scoreResult,
    locationConsensus,
  };
};

export default {
  calculateTrustScore,
  scoreFormulaA,
  scoreFormulaB,
  scoreFormulaC,
};
