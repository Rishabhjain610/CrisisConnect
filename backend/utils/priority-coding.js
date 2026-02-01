import Incident from "../models/incident.model.js";

export const determinePriorityCode = async (
  trustScore,
  forensics,
  voiceAnalysis,
  visionAnalysis,
  locationConsensus,
  latitude,
  longitude,
) => {
  console.log("\n\n" + "█".repeat(70));
  console.log("█  PHASE 5: PRIORITY CODING (911-STYLE)");
  console.log("█".repeat(70));

  // ==================== DEEPFAKE CHECK FIRST ====================
  // If image was marked as fake/deepfake during forensics, mark as SPAM
  if (forensics.isFake) {
    console.log("🚨 DEEPFAKE DETECTED - MARKING AS SPAM");
    return {
      code: "X-RAY",
      description: "🚨 SPAM: Deepfake/AI-generated image detected",
      dispatchLevel: 0,
      autoDispatch: false,
      reason: "Deepfake rejected",
    };
  }

  const score = trustScore.totalScore;
  const keywords = (voiceAnalysis?.keywords || []).map((k) => k.toLowerCase());
  const objects = (visionAnalysis?.detected || []).map((o) => o.toLowerCase());
  const emergencyObjects = (visionAnalysis?.emergency_detected || []).map((o) => o.toLowerCase());

  console.log(`\n📊 Trust Score: ${score}`);
  console.log(`🔴 Emergency Objects: ${emergencyObjects.join(", ") || "None"}`);
  console.log(`🎤 Voice Keywords: ${keywords.join(", ") || "None"}`);
  console.log(`📍 Location Consensus: ${locationConsensus.score}`);

  let code = "ALPHA";
  let description = "Standard incident";
  let dispatchLevel = 2;
  let autoDispatch = false;

  // ==================== OMEGA: Mass Calamity Detection ====================
  console.log("\n🔴 OMEGA Check: Mass Calamity Detection...");
  const velocityCheck = await checkVelocity(latitude, longitude);

  if (velocityCheck.reportsPerMinute >= 50) {
    console.log(
      `🚨 OMEGA TRIGGERED: ${velocityCheck.reportsPerMinute} reports/min in 1km radius`
    );
    code = "OMEGA";
    description = `🚨 MASS CALAMITY: ${velocityCheck.reportsPerMinute} incidents reported in 1 minute`;
    dispatchLevel = 5;
    autoDispatch = true;
    return { code, description, dispatchLevel, autoDispatch };
  }

  // ==================== DELTA: Critical Life-Threatening ====================
  console.log("\n🔴 DELTA Check: Life-Threatening Emergency...");

  const hasTrapped = keywords.some((k) => k.includes("trapped")) ||
    emergencyObjects.some((o) => o.includes("collapse")) ||
    keywords.some((k) => k.includes("buried"));

  const hasDying = keywords.some((k) =>
    ["dying", "dead", "cardiac", "not breathing", "unconscious"].some((e) =>
      k.includes(e)
    )
  );

  const hasSevereInjury = keywords.some((k) => k.includes("bleeding")) ||
    emergencyObjects.some((o) => o.includes("blood"));

  const hasStructuralCollapse = emergencyObjects.some(
    (o) =>
      o.includes("collapse") ||
      o.includes("building") ||
      o.includes("debris")
  );

  if (
    (hasTrapped && score > 80) ||
    hasDying ||
    (hasSevereInjury && score > 75) ||
    (hasStructuralCollapse && score > 80)
  ) {
    console.log("🚨 DELTA TRIGGERED: Life-threatening emergency detected");
    code = "DELTA";
    description = "🚨 CRITICAL: Life-threatening emergency - Immediate dispatch required";
    dispatchLevel = 5;
    autoDispatch = true;
    return { code, description, dispatchLevel, autoDispatch };
  }

  // ==================== CHARLIE: Major Emergency ====================
  console.log("\n🟠 CHARLIE Check: Major Emergency...");

  const hasFire = emergencyObjects.some((o) =>
    ["fire", "flames", "burning", "smoke"].some((e) => o.includes(e))
  );

  const hasMultipleInjuries = keywords.filter((k) =>
    ["injury", "blood", "hurt", "injured"].some((e) => k.includes(e))
  ).length > 1;

  if (
    (hasFire && score > 75) ||
    (hasMultipleInjuries && score > 70) ||
    (emergencyObjects.length > 2 && score > 75)
  ) {
    console.log("🟠 CHARLIE TRIGGERED: Major emergency detected");
    code = "CHARLIE";
    description = "🟠 MAJOR: Major emergency - Dispatch required";
    dispatchLevel = 4;
    autoDispatch = true;
    return { code, description, dispatchLevel, autoDispatch };
  }

  // ==================== BRAVO: Moderate Emergency ====================
  console.log("\n🟡 BRAVO Check: Moderate Emergency...");

  if (
    score > 65 &&
    (emergencyObjects.length > 0 || keywords.length > 0)
  ) {
    console.log("🟡 BRAVO TRIGGERED: Moderate emergency detected");
    code = "BRAVO";
    description = "🟡 MODERATE: Moderate emergency - Standard dispatch";
    dispatchLevel = 3;
    autoDispatch = false;
    return { code, description, dispatchLevel, autoDispatch };
  }

  // ==================== ALPHA: Standard Report ====================
  console.log("\n🟢 ALPHA: Standard incident report");
  code = "ALPHA";
  description = "🟢 STANDARD: Regular incident report";
  dispatchLevel = 2;
  autoDispatch = false;

  return { code, description, dispatchLevel, autoDispatch };
};

/**
 * ==================== VELOCITY CHECK: Mass Calamity Detection ====================
 */
const checkVelocity = async (latitude, longitude) => {
  try {
    const radiusMeters = 1000; // 1km radius
    const earthRadiusMeters = 6378137;
    const radiusInRadians = radiusMeters / earthRadiusMeters;

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const reportsInLastMinute = await Incident.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [[Number(longitude), Number(latitude)], radiusInRadians],
        },
      },
      createdAt: { $gte: oneMinuteAgo },
      status: { $in: ["Pending", "Active"] },
    });

    console.log(
      `   Reports in last 1 minute (1km): ${reportsInLastMinute}`
    );

    return {
      reportsPerMinute: reportsInLastMinute,
      radius: radiusMeters,
      timeWindow: "1 minute",
    };
  } catch (err) {
    console.error("Velocity check error:", err.message);
    return { reportsPerMinute: 0, radius: 1000, timeWindow: "1 minute" };
  }
};

export default { determinePriorityCode, checkVelocity };