import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
    item_name: { type: String, required: true }, // e.g., "Water Bottles", "Ambulance"
    quantity: { type: Number, required: true },
    category: { type: String, enum: ['Food', 'Medical', 'Equipment'] },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    status: { type: String, enum: ['Available', 'Depleted', 'Reserved'], default: 'Available' }
}, { timestamps: true });

resourceSchema.index({ location: '2dsphere' });

const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;