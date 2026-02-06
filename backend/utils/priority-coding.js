
import Incident from "../models/incident.model.js";

/**
 * ==================== VELOCITY CHECK: Mass Calamity Detection ====================
 */
const checkIncidentVelocity = async (latitude, longitude) => {
  try {
    const radiusMeters = 1000; // 1km radius
    const earthRadiusMeters = 6378137;
    const radiusInRadians = radiusMeters / earthRadiusMeters;

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentIncidents = await Incident.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [[Number(longitude), Number(latitude)], radiusInRadians]
        }
      },
      createdAt: { $gte: oneMinuteAgo },
      status: { $in: ["Pending", "Active"] }
    });

    console.log(`   📈 Recent incidents (1km, 1min): ${recentIncidents}`);

    return {
      reportsPerMinute: recentIncidents,
      radius: radiusMeters,
      timeWindow: "1 minute"
    };
  } catch (err) {
    console.error("❌ Velocity check error:", err.message);
    return { reportsPerMinute: 0, radius: 1000, timeWindow: "1 minute" };
  }
};

/**
 * ==================== MAIN PRIORITY DETERMINATION ====================
 */
export const determinePriorityCode = async (
  trustScore,
  forensics,
  voiceAnalysis,
  visionAnalysis,
  locationConsensus,
  latitude,
  longitude
) => {
  console.log("\n\n" + "█".repeat(70));
  console.log("█  PHASE 5: PRIORITY CODE DETERMINATION");
  console.log("█".repeat(70));

  const score = trustScore.totalScore || 0;
  const keywords = (voiceAnalysis?.keywords || []).map(k => k.toLowerCase());
  const emergencyObjects = (visionAnalysis?.emergency_detected || []).map(o => o.toLowerCase());
  
  console.log(`\n📊 Trust Score: ${score.toFixed(1)}`);
  console.log(`🎤 Voice Keywords: ${keywords.join(", ") || "None"}`);
  console.log(`👀 Emergency Objects: ${emergencyObjects.join(", ") || "None"}`);
  console.log(`📍 Location Consensus: ${locationConsensus?.score || 0}`);

  // 🔥 SPAM DETECTION: AI-generated images get marked as spam but with low priority
  if (forensics.isFake) {
    console.log("🚨 AI-GENERATED IMAGE DETECTED - MARKING AS SPAM");
    return {
      code: "X-RAY",
      description: `⚠️ FLAGGED: Suspected AI-generated content (${forensics.confidenceScore}% confidence)`,
      dispatchLevel: 0,
      autoDispatch: false,
      reason: "AI-generated image detected",
      spamRisk: "high"
    };
  }

  // OMEGA: Mass Calamity Detection
  console.log("\n🔍 OMEGA Check: Mass Calamity Detection...");
  const velocity = await checkIncidentVelocity(latitude, longitude);
  
  if (velocity.reportsPerMinute >= 10) {
    console.log(`🚨 OMEGA TRIGGERED: ${velocity.reportsPerMinute} reports/min`);
    return {
      code: "OMEGA",
      description: `🚨 MASS EMERGENCY: ${velocity.reportsPerMinute} incidents in 1km radius within 1 minute`,
      dispatchLevel: 5,
      autoDispatch: true,
      reason: "Mass calamity detected",
      velocity: velocity
    };
  }

  // DELTA: Critical Life-Threatening
  console.log("\n🔍 DELTA Check: Life-Threatening Emergency...");
  
  const hasLifeThreat = keywords.some(k => 
    ["trapped", "dying", "dead", "unconscious", "not breathing", "cardiac arrest"].some(t => k.includes(t))
  );
  const hasTrapped = keywords.some(k => k.includes("trapped")) || 
                    emergencyObjects.some(o => ["collapse", "debris", "building"].some(t => o.includes(t)));
  const hasSevereInjury = keywords.some(k => ["bleeding", "severe"].some(t => k.includes(t))) ||
                         emergencyObjects.some(o => o.includes("blood"));
  const hasStructuralFailure = emergencyObjects.some(o => 
    ["collapse", "building", "structure", "debris"].some(t => o.includes(t))
  );

  if (score >= 75 && (hasLifeThreat || (hasTrapped && score >= 80) || (hasStructuralFailure && score >= 80))) {
    console.log("🚨 DELTA TRIGGERED: Life-threatening emergency");
    return {
      code: "DELTA",
      description: "🚨 CRITICAL: Life-threatening emergency - Immediate response required",
      dispatchLevel: 5,
      autoDispatch: true,
      reason: hasLifeThreat ? "Life threat detected" : 
              hasTrapped ? "Person trapped" : "Structural collapse"
    };
  }

  // CHARLIE: Major Emergency
  console.log("\n🔍 CHARLIE Check: Major Emergency...");
  
  const hasFire = keywords.some(k => ["fire", "burning", "flames"].some(t => k.includes(t))) ||
                  emergencyObjects.some(o => ["fire", "flames", "smoke", "burning"].some(t => o.includes(t)));
  const hasFlood = keywords.some(k => ["flood", "flooding", "drowning"].some(t => k.includes(t))) ||
                   emergencyObjects.some(o => ["flood", "water", "flooding"].some(t => o.includes(t)));
  const hasMultipleInjuries = keywords.filter(k => 
    ["injury", "injured", "hurt", "blood", "bleeding"].some(t => k.includes(t))
  ).length > 1;
  const hasAccident = keywords.some(k => ["accident", "crash", "collision"].some(t => k.includes(t)));

  if (score >= 60 && (
    (hasFire && score >= 70) ||
    (hasFlood && score >= 70) ||
    (hasMultipleInjuries && score >= 65) ||
    (hasAccident && score >= 65) ||
    (emergencyObjects.length >= 2 && score >= 70)
  )) {
    console.log("🟡 CHARLIE TRIGGERED: Major emergency");
    return {
      code: "CHARLIE",
      description: "🟡 MAJOR: Significant emergency - Priority dispatch required",
      dispatchLevel: 4,
      autoDispatch: true,
      reason: hasFire ? "Fire emergency" :
              hasFlood ? "Flood emergency" :
              hasMultipleInjuries ? "Multiple injuries" :
              hasAccident ? "Accident reported" : "Major emergency detected"
    };
  }

  // BRAVO: Moderate Emergency
  console.log("\n🔍 BRAVO Check: Moderate Emergency...");
  
  if (score >= 45 && (
    emergencyObjects.length > 0 || 
    keywords.length > 0 || 
    (locationConsensus?.score >= 50) ||
    visionAnalysis?.severity === "High"
  )) {
    console.log("🔵 BRAVO TRIGGERED: Moderate emergency");
    return {
      code: "BRAVO",
      description: "🔵 MODERATE: Standard emergency response required",
      dispatchLevel: 3,
      autoDispatch: false,
      reason: "Moderate emergency detected"
    };
  }

  // ALPHA: Standard Report
  console.log("\n🔍 ALPHA: Standard incident");
  
  let alphaReason = "Standard incident report";
  if (score < 30) {
    alphaReason = "Low confidence report - requires verification";
  }

  return {
    code: "ALPHA",
    description: "🟢 STANDARD: Regular incident report",
    dispatchLevel: 2,
    autoDispatch: false,
    reason: alphaReason,
    lowConfidence: score < 30
  };
};

export default { 
  determinePriorityCode, 
  checkIncidentVelocity 
};