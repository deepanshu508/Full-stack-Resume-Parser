import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    industry: {
      type: String,
      trim: true,
      default: ""
    },
    contact_person: {
      type: String,
      trim: true,
      default: ""
    },
    email: {
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

export default mongoose.model("Client", clientSchema);
