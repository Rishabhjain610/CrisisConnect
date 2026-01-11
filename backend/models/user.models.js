import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['citizen', 'agency', 'coordinator'],
    default: 'citizen'
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;