import express from "express";
import multer from "multer";
import {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  markIncidentSpam,
  getNearbyIncidents,
  deleteIncident,
  getIncidentStats,
  dispatchIncident,
} from "../controller/incident.controller.js";
import  isAuth  from "../middleware/auth.middleware.js";

const IncidentRouter = express.Router();

// Multer setup for image uploads
const upload = multer({ dest: "uploads/" });

// Stats (must be before :incidentId)
IncidentRouter.get("/stats/summary", getIncidentStats);

// Create (protected) - supports multipart image upload field name "image"
IncidentRouter.post("/create", isAuth, upload.single("image"), createIncident);

// List
IncidentRouter.get("/list", getIncidents);

// Nearby
IncidentRouter.get("/nearby/:lat/:lon", getNearbyIncidents);

// Dispatch
IncidentRouter.post("/:incidentId/dispatch", isAuth, dispatchIncident);

// Single incident
IncidentRouter.get("/:incidentId", getIncidentById);

// Update status / dispatch (protected)
IncidentRouter.patch("/:incidentId/status", isAuth, updateIncidentStatus);

// Mark spam (protected)
IncidentRouter.patch("/:incidentId/mark-spam", isAuth, markIncidentSpam);

// Delete (protected)
IncidentRouter.delete("/:incidentId", isAuth, deleteIncident);

export default IncidentRouter;