import mongoose from "mongoose";

const allowedStatuses = [
  "New",
  "Contacted",
  "Interested",
  "Interview Scheduled",
  "Selected",
  "Joined",
  "Not Interested"
];

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      required: true
    },
    location: {
      type: String,
      trim: true,
      default: ""
    },
    uploadedBy: {
      type: String,
      trim: true,
      required: true
    },
    status: {
      type: String,
      enum: allowedStatuses,
      default: "New"
    },
    remarks: {
      type: String,
      trim: true,
      default: ""
    },
    lastContacted: {
      type: Date,
      default: null
    },
    skills: {
      type: [String],
      default: []
    },
    experience: {
      type: String,
      trim: true,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

export default mongoose.model("Candidate", candidateSchema);
