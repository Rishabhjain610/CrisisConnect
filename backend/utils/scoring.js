
import Incident from "../models/incident.model.js";

/**
 * ==================== LOCATION CONSENSUS ====================
 */
const calculateLocationConsensus = async (latitude, longitude) => {
  try {
    console.log("\n📍 Location Consensus Analysis...");

    const radiusMeters = 1000;
    const earthRadiusMeters = 6378137;
    const radiusInRadians = radiusMeters / earthRadiusMeters;
    
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const nearbyIncidents = await Incident.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [[Number(longitude), Number(latitude)], radiusInRadians]
        }
      },
      createdAt: { $gte: fifteenMinutesAgo },
      status: { $in: ["Pending", "Active"] }
    });

    let consensusScore = 0;
    if (nearbyIncidents >= 3) consensusScore = 100;
    else if (nearbyIncidents >= 2) consensusScore = 75;
    else if (nearbyIncidents >= 1) consensusScore = 50;
    else consensusScore = 0;

    console.log(`   Nearby incidents (15min): ${nearbyIncidents}`);
    console.log(`   Consensus score: ${consensusScore}`);

    return {
      nearbyIncidents: nearbyIncidents,
      score: consensusScore,
      radius: radiusMeters,
      timeWindow: "15 minutes"
    };
  } catch (err) {
    console.error("❌ Location consensus error:", err.message);
    return { nearbyIncidents: 0, score: 0, radius: 1000, timeWindow: "15 minutes" };
  }
};

/**
 * ==================== FORMULA A: IMAGE + TEXT MODE ====================
 * 🔴 NOW RESPECTS imageFormat.maxTrustScore FOR PNG CAPPING
 */
export const scoreFormulaA = async (forensics, visionAnalysis, semantics, locationConsensus, imageFormat) => {
  console.log("\n📊 FORMULA A: IMAGE + TEXT MODE");

  // 🔥 AI-SUSPECTED HANDLING: Low score but don't block
  if (forensics.isFake) {
    console.log("⚠️ AI-generated image detected - Applying penalty");
    
    const penaltyScore = 10 + (locationConsensus.score * 0.15);
    let finalScore = Math.min(25, penaltyScore);
    
    // 🔴 IF PNG, CAP EVEN LOWER
    if (imageFormat?.isPNG) {
      finalScore = Math.min(finalScore, 25);
      console.log(`   🔴 PNG PENALTY: Score capped to ${finalScore}`);
    }
    
    return {
      formula: "FORMULA_A",
      totalScore: finalScore,
      breakdown: {
        visual: 0,
        alignment: 0,
        consensus: locationConsensus.score,
        realismFactor: forensics.realismFactor,
        penalty: "AI_SUSPECTED",
        confidenceScore: forensics.confidenceScore
      }
    };
  }

  // Normal scoring for authentic images
  let visualScore = 30;

  // Emergency object detection scoring
  const emergencyObjects = (visionAnalysis.emergency_detected || []).map(o => o.toLowerCase());
  
  if (emergencyObjects.length > 0) {
    console.log(`   🔴 Emergency objects: ${emergencyObjects.join(", ")}`);
    
    const hasFire = emergencyObjects.some(o => 
      ["fire", "flames", "burning", "smoke"].some(e => o.includes(e))
    );
    const hasBlood = emergencyObjects.some(o => 
      ["blood", "injury", "trauma", "wounded"].some(e => o.includes(e))
    );
    const hasCollapse = emergencyObjects.some(o => 
      ["collapse", "debris", "building", "rubble"].some(e => o.includes(e))
    );
    const hasFlood = emergencyObjects.some(o => 
      ["flood", "water", "flooding", "submerged"].some(e => o.includes(e))
    );

    if (hasFire || hasCollapse) {
      visualScore = 90;
      console.log("   🔥 Critical emergency detected: Score = 90");
    } else if (hasBlood || hasFlood) {
      visualScore = 80;
      console.log("   🩸 Serious emergency detected: Score = 80");
    } else {
      visualScore = 70;
      console.log("   🟡 General emergency detected: Score = 70");
    }
  } else {
    switch (visionAnalysis.severity) {
      case "Critical":
        visualScore = 85;
        break;
      case "High":
        visualScore = 70;
        break;
      case "Medium":
        visualScore = 50;
        break;
      default:
        visualScore = 30;
    }
    console.log(`   📊 Severity-based score: ${visualScore}`);
  }

  const alignmentScore = semantics.alignmentScore || 40;
  console.log(`   🔗 Alignment score: ${alignmentScore}`);

  const preRealismScore = (visualScore * 0.5) + (alignmentScore * 0.2) + (locationConsensus.score * 0.3);
  let finalScore = Math.min(100, preRealismScore * forensics.realismFactor);

  // 🔴 PNG DETECTION: CAP SCORE BELOW 30
  if (imageFormat?.isPNG) {
    console.log(`   🔴 PNG DETECTED - Capping score below 30`);
    finalScore = Math.min(finalScore, 29); // Max 29 for PNG
    
    // If still above 20, randomize in 15-29 range
    if (finalScore > 20) {
      finalScore = Math.floor(Math.random() * (29 - 15 + 1)) + 15;
      console.log(`   🔴 PNG RANDOMIZED: Score set to ${finalScore} (15-29 range)`);
    }
  }

  console.log(`   📊 Final score: ${finalScore.toFixed(1)}`);

  return {
    formula: "FORMULA_A",
    totalScore: finalScore,
    breakdown: {
      visual: visualScore,
      alignment: alignmentScore,
      consensus: locationConsensus.score,
      realismFactor: forensics.realismFactor,
      emergencyDetected: emergencyObjects
    }
  };
};

/**
 * ==================== FORMULA B: VOICE SOS MODE ====================
 */
export const scoreFormulaB = async (voiceAnalysis, locationConsensus) => {
  console.log("\n📊 FORMULA B: VOICE SOS MODE");

  const CRITICAL_KEYWORDS = {
    trapped: 95,
    help: 75,
    emergency: 80,
    fire: 90,
    burning: 85,
    blood: 85,
    dying: 100,
    unconscious: 90,
    collapse: 95,
    accident: 70,
    flood: 80,
    drowning: 95
  };

  let keywordScore = 0;
  const foundKeywords = voiceAnalysis.keywords || [];
  
  console.log(`   🎤 Keywords: ${foundKeywords.join(", ") || "None"}`);

  for (const keyword of foundKeywords) {
    const keywordLower = keyword.toLowerCase();
    for (const [critical, score] of Object.entries(CRITICAL_KEYWORDS)) {
      if (keywordLower.includes(critical)) {
        keywordScore = Math.max(keywordScore, score);
      }
    }
  }

  if (keywordScore === 0) {
    keywordScore = Math.min(70, (voiceAnalysis.urgency || 5) * 8);
  }

  let sentimentScore = 50;
  switch (voiceAnalysis.sentiment) {
    case "panic":
      sentimentScore = 85;
      break;
    case "calm":
      sentimentScore = 30;
      break;
    default:
      sentimentScore = 50;
  }

  console.log(`   🔑 Keyword score: ${keywordScore}`);
  console.log(`   😰 Sentiment score: ${sentimentScore} (${voiceAnalysis.sentiment})`);
  console.log(`   📈 Urgency: ${voiceAnalysis.urgency}/10`);

  const totalScore = Math.min(100,
    (keywordScore * 0.5) +
    (sentimentScore * 0.2) +
    (locationConsensus.score * 0.3)
  );

  console.log(`   📊 Final voice score: ${totalScore.toFixed(1)}`);

  return {
    formula: "FORMULA_B",
    totalScore: totalScore,
    breakdown: {
      keywords: keywordScore,
      sentiment: sentimentScore,
      urgency: voiceAnalysis.urgency,
      consensus: locationConsensus.score
    }
  };
};

/**
 * ==================== FORMULA C: HYBRID SHAKE MODE ====================
 * 🔴 NOW RESPECTS imageFormat.maxTrustScore
 */
export const scoreFormulaC = async (forensics, visionAnalysis, voiceAnalysis, locationConsensus, imageFormat) => {
  console.log("\n📊 FORMULA C: HYBRID SHAKE MODE");

  const isPocket = forensics.isPocket;
  console.log(`   📱 Pocket mode: ${isPocket}`);

  let visualScore = 0;
  if (!isPocket) {
    const emergencyObjects = (visionAnalysis.emergency_detected || []).map(o => o.toLowerCase());
    
    if (emergencyObjects.length > 0) {
      visualScore = 75;
      console.log("   👀 Emergency objects detected in shake mode");
    } else {
      visualScore = 30;
    }
  } else {
    visualScore = 10;
    console.log("   📱 Pocket mode - minimal visual scoring");
  }

  const voiceScore = await scoreFormulaB(voiceAnalysis, { score: 0, nearbyIncidents: 0 });
  const audioScore = voiceScore.totalScore;

  console.log(`   👀 Visual score: ${visualScore}`);
  console.log(`   🎤 Audio score: ${audioScore}`);

  const weights = isPocket
    ? { visual: 0.1, audio: 0.6, consensus: 0.3 }
    : { visual: 0.4, audio: 0.4, consensus: 0.2 };

  let totalScore = Math.min(100,
    (visualScore * weights.visual) +
    (audioScore * weights.audio) +
    (locationConsensus.score * weights.consensus)
  );

  // 🔴 PNG DETECTION: CAP SCORE BELOW 30
  if (imageFormat?.isPNG) {
    console.log(`   🔴 PNG DETECTED - Capping shake score below 30`);
    totalScore = Math.min(totalScore, 29);
    
    if (totalScore > 20) {
      totalScore = Math.floor(Math.random() * (29 - 15 + 1)) + 15;
      console.log(`   🔴 PNG RANDOMIZED: Score set to ${totalScore} (15-29 range)`);
    }
  }

  console.log(`   📊 Final shake score: ${totalScore.toFixed(1)}`);

  return {
    formula: "FORMULA_C",
    totalScore: totalScore,
    breakdown: {
      visual: visualScore * weights.visual,
      audio: audioScore * weights.audio,
      consensus: locationConsensus.score * weights.consensus,
      weights: weights
    },
    isPocket: isPocket
  };
};

/**
 * ==================== MASTER SCORING FUNCTION ====================
 * 🔴 NOW PASSES imageFormat TO FORMULAS
 */
export const calculateTrustScore = async (
  mode,
  forensics,
  visionAnalysis,
  voiceAnalysis,
  semantics,
  latitude,
  longitude
) => {
  console.log("\n\n" + "█".repeat(70));
  console.log("█  PHASE 4: TRUST SCORE CALCULATION");
  console.log("█".repeat(70));

  const locationConsensus = await calculateLocationConsensus(latitude, longitude);

  // 🔴 GET IMAGE FORMAT FROM visionAnalysis
  const imageFormat = visionAnalysis?.imageFormat || {
    type: "UNKNOWN",
    isPNG: false,
    maxTrustScore: 100,
  };

  console.log(`\n🖼️ Image Format: ${imageFormat.type}`);
  if (imageFormat.isPNG) {
    console.log(`   🔴 PNG DETECTED - Max Trust Score: 30 (HARD CAP)`);
  }

  let scoreResult;

  switch (mode) {
    case "SHAKE_HYBRID":
      scoreResult = await scoreFormulaC(forensics, visionAnalysis, voiceAnalysis, locationConsensus, imageFormat);
      break;
    
    case "VOICE":
      scoreResult = await scoreFormulaB(voiceAnalysis, locationConsensus);
      break;
    
    case "IMAGE_TEXT":
    default:
      scoreResult = await scoreFormulaA(forensics, visionAnalysis, semantics, locationConsensus, imageFormat);
      break;
  }

  scoreResult.locationConsensus = locationConsensus;

  console.log(`\n🏆 FINAL TRUST SCORE: ${scoreResult.totalScore.toFixed(1)}/100`);
  console.log(`📋 Formula: ${scoreResult.formula}`);
  if (imageFormat.isPNG) {
    console.log(`🔴 IMAGE FORMAT: PNG (Score capped below 30)`);
  }
  
  return scoreResult;
};

export default {
  calculateTrustScore,
  scoreFormulaA,
  scoreFormulaB,
  scoreFormulaC,
  calculateLocationConsensus
};