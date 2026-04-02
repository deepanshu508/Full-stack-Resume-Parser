import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    client_name: {
      type: String,
      trim: true,
      default: ""
    },
    role: {
      type: String,
      trim: true,
      default: ""
    },
    location: {
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

export default mongoose.model("Project", projectSchema);
