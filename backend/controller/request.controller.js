import Resource from "../models/resource.model.js";
import Request from "../models/request.model.js";
import Incident from "../models/incident.model.js";
import User from "../models/user.models.js";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

console.log("Twilio SID:", process.env.TWILIO_SID ? "Loaded" : "MISSING");
console.log("Twilio Token:", process.env.TWILIO_AUTH_TOKEN ? "Loaded" : "MISSING");

const client = process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// 1. Find Coordinators with resources near the incident
export const findNearestCoordinators = async (req, res) => {
    try {
        const { latitude, longitude, radius = 50 } = req.body;

        const coordinators = await Resource.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                    distanceField: "distance",
                    maxDistance: radius * 1000,
                    spherical: true,
                    query: { status: "Available" }
                }
            },
            {
                $group: {
                    _id: "$owner",
                    resourceCount: { $sum: 1 },
                    nearestResourceDist: { $min: "$distance" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "details"
                }
            },
            { $unwind: "$details" },
            {
                $project: {
                    _id: 1,
                    name: "$details.name",
                    phone: "$details.phone",
                    email: "$details.email",
                    resourceCount: 1,
                    distanceKm: { $divide: ["$nearestResourceDist", 1000] }
                }
            },
            { $sort: { distanceKm: 1 } }
        ]);

        return res.status(200).json({ coordinators });
    } catch (error) {
        console.error("Find Coordinators Error:", error);
        return res.status(500).json({ message: "Error finding coordinators" });
    }
};

// 2. Create Request & Notify Coordinator (Agency -> Coordinator)
export const createRequest = async (req, res) => {
    try {
        const { coordinatorId, incidentId, resources } = req.body;
        const agencyId = req.userId;

        const newRequest = new Request({
            agencyId,
            coordinatorId,
            incidentId,
            resourcesRequested: resources,
            status: "Pending"
        });
        await newRequest.save();

        const coordinator = await User.findById(coordinatorId);

        if (client && coordinator?.phone) {
            try {
                await client.messages.create({
                    body: `🚨 ALERT: New Dispatch Request! An Agency needs ${resources.length} resource types. Log in to Coordinator Dashboard to Approve.`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: coordinator.phone
                });
            } catch (smsErr) {
                console.error("Twilio Error:", smsErr.message);
            }
        }

        return res.status(201).json({ message: "Request sent successfully", request: newRequest });
    } catch (error) {
        console.error("Create Request Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;
        const coordinatorId = req.userId;

        // ✅ 1. Fix Populate to get Citizen Details
        const request = await Request.findById(requestId)
            .populate("agencyId")
            .populate({
                path: "incidentId",
                populate: { path: "reportedBy" } // This fetches the Citizen's Phone Number
            });
        if (!request) return res.status(404).json({ message: "Request not found" });

        // --- FETCH INCIDENT FOR DESTINATION ---
        const incident = await Incident.findById(request.incidentId);
        if (!incident) return res.status(404).json({ message: "Target Incident not found" });

        if (request.status !== "Pending") {
            return res.status(400).json({ message: "Request already handled" });
        }

        // --- REJECTION LOGIC ---
        if (status === "Rejected") {
            request.status = "Rejected";
            await request.save();

            // Notify Agency
            if (client && request.agencyId?.phone) {
                try {
                    await client.messages.create({
                        body: `❌ Request Declined: Coordinator cannot fulfill request for Incident #${request.incidentId.toString().slice(-4)}.`,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: request.agencyId.phone
                    });
                } catch (e) { console.error("Twilio Error", e); }
            }
            return res.status(200).json({ message: "Request Rejected", request });
        }

        // --- ACCEPTANCE LOGIC (WITH SIMULATION) ---
        if (status === "Accepted") {
            const requestedItems = request.resourcesRequested;
            const deployedLog = [];
            const failedLog = [];
            const remainingItems = [];
            const citizen = request.incidentId?.reportedBy;

            for (const item of requestedItems) {
                const resource = await Resource.findOne({
                    owner: coordinatorId,
                    item_name: item.item_name,
                    status: "Available"
                });

                if (!resource || resource.quantity <= 0) {
                    failedLog.push(`${item.quantity}x ${item.item_name}`);
                    remainingItems.push(item);
                    continue;
                }

                const quantityToDeploy = Math.min(resource.quantity, item.quantity);
                const quantityLeft = item.quantity - quantityToDeploy;

                // 1. Deduct Inventory
                resource.quantity -= quantityToDeploy;
                if (resource.quantity <= 0) {
                    await Resource.findByIdAndDelete(resource._id);
                } else {
                    await resource.save();
                }

                // 2. Create Deployed Resource
                const deployedResource = await Resource.create({
                    owner: coordinatorId,
                    item_name: item.item_name,
                    category: item.category,
                    quantity: quantityToDeploy,
                    status: "Deployed",
                    current_incident: request.incidentId,
                    location: resource.location
                });

                // 3. START SIMULATION (Base -> Incident)
                // We use "fire and forget" so the response is instant
                simulateMovement(
                    deployedResource._id,
                    resource.location.coordinates, // Start (Coordinator Base)
                    incident.location.coordinates  // End (Incident Site)
                );

                deployedLog.push(`${quantityToDeploy}x ${item.item_name}`);

                if (quantityLeft > 0) {
                    item.quantity = quantityLeft;
                    remainingItems.push(item);
                    failedLog.push(`${quantityLeft}x ${item.item_name}`);
                }
            }

            request.status = "Accepted";
            request.resourcesRequested = remainingItems;
            await request.save();

            // Notify Agency
            const agency = request.agencyId;
            if (client && agency?.phone) {
                let msgBody = `Updates for Incident #${request.incidentId.toString().slice(-4)}:\n`;
                if (deployedLog.length > 0) msgBody += `✅ ON THE WAY: ${deployedLog.join(", ")}\n`;
                if (failedLog.length > 0) msgBody += `⚠️ UNAVAILABLE: ${failedLog.join(", ")}`;

                try {
                    await client.messages.create({
                        body: msgBody,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: agency.phone
                    });
                } catch (smsErr) { console.error("Twilio Error:", smsErr.message); }
            }

            // Notify Citizen (Reporter)
            if (client && deployedLog.length > 0) {
                const reporter = await User.findById(incident.reportedBy).select("name phone");
                if (reporter?.phone) {
                    const citizenMsg = `✅ Help is on the way for your report #${request.incidentId.toString().slice(-4)}.\nResources en route: ${deployedLog.join(", ")}\nTrack live in the app.`;
                    try {
                        await client.messages.create({
                            body: citizenMsg,
                            from: process.env.TWILIO_PHONE_NUMBER,
                            to: reporter.phone
                        });
                    } catch (smsErr) { console.error("Twilio Error:", smsErr.message); }
                }
            }

            if (client && citizen?.phone) {
                try {
                    await client.messages.create({
                        body: `🚑 HELP IS ON THE WAY! \nYour incident (#${incident._id.toString().slice(-4)}) has been accepted. Response units are en route to your location. You can track them in the app.`,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: citizen.phone
                    });
                } catch (e) { console.error("Twilio Citizen Error", e); }
            }

            return res.status(200).json({
                message: "Request processed & Simulation Started",
                deployed: deployedLog,
                remaining: remainingItems
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// 4. Get Pending Requests for Coordinator Dashboard
export const getCoordinatorRequests = async (req, res) => {
    try {
        const requests = await Request.find({
            coordinatorId: req.userId,
            status: "Pending"
        })
            .populate("agencyId", "name email phone")
            .populate("incidentId")
            .sort({ createdAt: -1 });

        return res.status(200).json({ requests });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error fetching requests" });
    }
};

// 5. Get Request History for Agency Dashboard
// ✅ GET AGENCY REQUESTS (With "Live Only" Logic)
export const getAgencyRequests = async (req, res) => {
    try {
        const requests = await Request.find({ agencyId: req.userId })
            .populate("coordinatorId", "name email phone")
            .populate("incidentId", "type severity status") // We need 'status' to filter
            .sort({ createdAt: -1 });

        // 🔍 FILTER LOGIC:
        // Only show requests where the Incident is still "Pending" or "Active".
        // If it is "Resolved" or "Spam", hide it from the Live Dashboard.
        const liveRequests = requests.filter(req =>
            req.incidentId &&
            (req.incidentId.status === 'Pending' || req.incidentId.status === 'Active')
        );

        res.status(200).json({ requests: liveRequests });
    } catch (error) {
        console.error("Get Agency Requests Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// --- MOVEMENT SIMULATION ENGINE ---
const simulateMovement = async (resourceId, startCoords, endCoords) => {
    const steps = 20; // Move in 20 steps
    const intervalTime = 3000; // Update every 3 seconds (Total 60s trip)

    // Calculate Step Size (Linear Interpolation)
    const dLat = (endCoords[1] - startCoords[1]) / steps;
    const dLng = (endCoords[0] - startCoords[0]) / steps;

    let currentStep = 0;
    let currentLat = startCoords[1];
    let currentLng = startCoords[0];

    const timer = setInterval(async () => {
        currentStep++;
        currentLat += dLat;
        currentLng += dLng;

        try {
            if (currentStep >= steps) {
                // ARRIVAL: Snap to exact end location
                await Resource.findByIdAndUpdate(resourceId, {
                    location: { type: "Point", coordinates: [endCoords[0], endCoords[1]] }
                });
                clearInterval(timer);
                console.log(`Resource ${resourceId} has ARRIVED.`);
            } else {
                // MOVING: Update location
                await Resource.findByIdAndUpdate(resourceId, {
                    location: { type: "Point", coordinates: [currentLng, currentLat] }
                });
            }
        } catch (err) {
            console.error("Simulation Error:", err);
            clearInterval(timer);
        }
    }, intervalTime);
};


