import Incident from "../models/incident.model.js";
import Resource from "../models/resource.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

//  The "Commander" Chatbot
export const commanderChat = async (req, res) => {
  try {
    const { userQuery } = req.body;

    // 1. Fetch relevant live data from DB
    const availableResources = await Resource.find({ status: "Available" });
    const activeIncidents = await Incident.find({ status: "Open" });

    // 2. Feed context to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });
    const prompt = `
            Act as a Crisis Response Commander. 
            Here is the live data:
            Resources: ${JSON.stringify(availableResources)}
            Incidents: ${JSON.stringify(activeIncidents)}
            
            User Question: "${userQuery}"
            
            Answer strictly based on the data provided. Be concise and tactical.
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Commander Error:", error);
    res.status(500).json({ message: "Commander is offline." });
  }
};

//  Alert System Implementation
export const reportIncident = async (req, res) => {
  try {
    const { type, description, severity, latitude, longitude, userId } =
      req.body;

    const newIncident = new Incident({
      type,
      description,
      severity,
      location: { type: "Point", coordinates: [longitude, latitude] },
      reportedBy: userId,
    });

    await newIncident.save();

    // ALERT LOGIC: If High Severity, send SMS
    if (severity === "High" || severity === "Critical") {
      try {
        // In a real app, you'd loop through an array of agency numbers
        await client.messages.create({
          body: `URGENT ALERT: High severity ${type} reported at [${latitude}, ${longitude}]. Immediate response required.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.AGENCY_EMERGENCY_PHONE, // Add this to your .env
        });
        console.log("SMS Alert Sent");
      } catch (smsError) {
        console.error("Failed to send SMS:", smsError);
        // Don't fail the request just because SMS failed
      }
    }

    res
      .status(201)
      .json({ message: "Incident Reported", incident: newIncident });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error reporting incident", error: error.message });
  }
};
