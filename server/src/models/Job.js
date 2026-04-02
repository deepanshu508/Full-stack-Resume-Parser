import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    location: {
      type: String,
      trim: true,
      default: ""
    },
    min_experience: {
      type: Number,
      default: 0
    },
    max_experience: {
      type: Number,
      default: 0
    },
    skills: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

export default mongoose.model("Job", jobSchema);
