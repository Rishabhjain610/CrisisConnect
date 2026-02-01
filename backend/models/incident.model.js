
import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    // ==================== BASIC INFO ====================
    type: {
      type: String,
      enum: ["Fire", "Flood", "Medical", "Accident", "Infrastructure", "Other"],
      required: true,
    },
    description: String,
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: true,
    },
    mode: {
      type: String,
      enum: ["VOICE", "IMAGE_TEXT", "SHAKE_HYBRID"],
      required: true,
    },

    // ==================== MEDIA ====================
    transcript: String,
    translatedTranscript: String,
    language: { type: String, default: "en" },
    imageUrl: String,
    audioUrl: String,

    // ==================== LOCATION ====================
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },

    // ==================== FORENSICS (PHASE 1) ====================
    forensics: {
      realismFactor: { type: Number, default: 1.0, min: 0, max: 1 },
      isFake: { type: Boolean, default: false },
      confidenceScore: { type: Number, default: 0, min: 0, max: 100 },
      isPocket: { type: Boolean, default: false },
      verdict: String,
      deepfakeIndicators: [String],
      analysis: {
        camera: Object,
        aiDetected: Object,
        pixelAnalysis: Object,
        noiseAnalysis: Object,
        exifData: Object,
      },
    },

    // ==================== AI ANALYSIS (PHASE 2-3) ====================
    aiAnalysis: {
      vision: {
        detected: [String], // ["Fire", "Smoke", "People"]
        confidence: Number,
        model: String,
      },
      voice: {
        keywords: [String], // ["Help", "Trapped", "Fire"]
        sentiment: String, // "panic", "calm", "neutral"
        confidence: Number,
        model: String,
      },
      semantics: {
        alignment: Number, // 0-100: How well vision matches voice
        description: String,
        model: String,
      },
    },

    // ==================== SCORING (PHASE 4) ====================
    trustScore: {
      totalScore: { type: Number, default: 0, min: 0, max: 100 },
      formula: String, // "FORMULA_A", "FORMULA_B", "FORMULA_C"
      breakdown: {
        visual: Number,
        audio: Number,
        alignment: Number,
        consensus: Number,
      },
      locationConsensus: {
        nearbyIncidents: Number,
        score: Number,
      },
    },

    // ==================== PRIORITY CODING (PHASE 5) ====================
    priorityCode: {
      code: String, // "OMEGA", "ECHO", "DELTA", "CHARLIE", "X-RAY"
      description: String,
      dispatchLevel: Number, // 1-5 (5 = highest)
      autoDispatch: Boolean,
    },

    // ==================== STATUS & TRACKING ====================
    status: {
      type: String,
      enum: ["Pending", "Active", "Resolved", "Spam"],
      default: "Pending",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dispatchedResources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource",
      },
    ],

    // ==================== AUDIT LOG ====================
    verificationLog: [
      {
        phase: String, // "forensics", "ai", "scoring", etc.
        timestamp: Date,
        result: Object,
      },
    ],
  },
  { timestamps: true }
);

// Indexes
incidentSchema.index({ location: "2dsphere" });
// exactly agar without index karenge to pura search karega konse ambulance mere se kitne door hai, but with index wo jaldi se pata kar lega index me ek tree banayega jo fast searching ke liye use hota hai       2d sphere ke wajah se geospeatial queries kar sakte hai like $near nhi lagaya toh woh normal x y coordinate ke hisab se karega distance calculate but 2dsphere lagane se earth ke hisab se karega distance calculate $geoWithin yeh sab nhi hoga without 2dsphere index
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ trustScore: -1 });
incidentSchema.index({ "priorityCode.code": 1 });
incidentSchema.index({ reportedBy: 1 });

const Incident = mongoose.model("Incident", incidentSchema);
export default Incident;