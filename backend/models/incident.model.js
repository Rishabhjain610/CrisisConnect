import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true // e.g., "Fire", "Flood", "Medical"
    },
    description: String,
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        required: true
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [Longitude, Latitude]
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Resolved'],
        default: 'Open'
    },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Create a geospatial index for fast map queries
incidentSchema.index({ location: '2dsphere' });

const Incident = mongoose.model("Incident", incidentSchema);
export default Incident;