import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mammoth from "mammoth";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
import Candidate from "./models/Candidate.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || "gpt-5.2";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const openai = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;
const allowedStatuses = [
  "New",
  "Contacted",
  "Interested",
  "Interview Scheduled",
  "Selected",
  "Joined",
  "Not Interested"
];
const resumeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    skills: {
      type: "array",
      items: { type: "string" }
    },
    experience: { type: "string" }
  },
  required: ["name", "phone", "location", "skills", "experience"]
};

app.use(cors());
app.use(express.json());

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only PDF, DOC, and DOCX files are allowed."));
  }
});

const cleanExtractedText = (text) =>
  text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, " ")
    .trim();

const normalizePhone = (phone) => {
  const cleaned = (phone || "").replace(/[^\d+]/g, "").trim();
  return cleaned || "";
};

const getExperienceYears = (experience) => {
  const match = String(experience || "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const extractResumeText = async (file) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const fileBuffer = await fs.promises.readFile(file.path);

  if (extension === ".pdf") {
    const pdfData = await pdfParse(fileBuffer);
    return cleanExtractedText(pdfData.text || "");
  }

  if (extension === ".docx" || extension === ".doc") {
    try {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      return cleanExtractedText(value || "");
    } catch (error) {
      if (extension === ".doc") {
        throw new Error(
          "Legacy DOC files can be uploaded, but text extraction may fail. Please convert the file to DOCX or PDF and try again."
        );
      }

      throw error;
    }
  }

  throw new Error("Unsupported file type for text extraction.");
};

const parseResumeWithOpenAI = async (resumeText) => {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await openai.responses.create({
    model: openAiModel,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Extract structured resume data from messy resume text. Infer fields conservatively, normalize obvious formatting noise, and return empty strings or an empty array when a value is missing. Skills should be a deduplicated array of concise skill names. Experience should be the total years of professional experience as a short string such as '3 years' or '8+ years'."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Resume text:\n${resumeText}`
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "resume_parser",
        strict: true,
        schema: resumeSchema
      }
    }
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("OpenAI did not return structured resume data.");
  }

  return JSON.parse(outputText);
};

const saveCandidate = async (parsedData, uploadedBy) => {
  const candidateData = {
    name: parsedData.name?.trim() || "",
    phone: normalizePhone(parsedData.phone),
    location: parsedData.location?.trim() || "",
    uploadedBy: uploadedBy?.trim() || "",
    status: "New",
    remarks: "",
    skills: Array.isArray(parsedData.skills)
      ? [...new Set(parsedData.skills.map((skill) => skill.trim()).filter(Boolean))]
      : [],
    experience: parsedData.experience?.trim() || ""
  };

  if (!candidateData.phone) {
    throw new Error("Phone number is required.");
  }

  if (!candidateData.uploadedBy) {
    throw new Error("Uploader name or email is required.");
  }

  const existingCandidate = await Candidate.findOne({ phone: candidateData.phone }).lean();

  if (existingCandidate) {
    return {
      status: "Duplicate candidate",
      candidate: candidateData
    };
  }

  const savedCandidate = await Candidate.create(candidateData);

  return {
    status: "Saved",
    candidate: {
      name: savedCandidate.name,
      phone: savedCandidate.phone || "",
      location: savedCandidate.location,
      uploadedBy: savedCandidate.uploadedBy,
      status: savedCandidate.status,
      remarks: savedCandidate.remarks,
      lastContacted: savedCandidate.lastContacted,
      skills: savedCandidate.skills,
      experience: savedCandidate.experience
    }
  };
};

app.get("/health", (_req, res) => {
  res.send("Server running");
});

app.get("/recruiter-stats", async (_req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stats = await Candidate.aggregate([
      {
        $group: {
          _id: "$uploadedBy",
          addedToday: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0]
            }
          },
          contacted: {
            $sum: {
              $cond: [{ $eq: ["$status", "Contacted"] }, 1, 0]
            }
          },
          interested: {
            $sum: {
              $cond: [{ $eq: ["$status", "Interested"] }, 1, 0]
            }
          },
          selected: {
            $sum: {
              $cond: [{ $eq: ["$status", "Selected"] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          uploadedBy: "$_id",
          addedToday: 1,
          contacted: 1,
          interested: 1,
          selected: 1
        }
      },
      {
        $sort: {
          uploadedBy: 1
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

app.get("/candidates", async (req, res, next) => {
  try {
    const {
      location = "",
      skills = "",
      minExperience = "",
      maxExperience = "",
      status = "",
      uploadedBy = "",
      contactAge = ""
    } = req.query;
    const query = {};

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    if (status && allowedStatuses.includes(status)) {
      query.status = status;
    }

    if (uploadedBy) {
      query.uploadedBy = { $regex: uploadedBy, $options: "i" };
    }

    if (skills) {
      query.skills = { $elemMatch: { $regex: skills, $options: "i" } };
    }

    let candidates = await Candidate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const minimumYears = Number(minExperience);
    const maximumYears = Number(maxExperience);
    const contactAgeDays = Number(contactAge);

    if (!Number.isNaN(minimumYears) && minExperience !== "") {
      candidates = candidates.filter(
        (candidate) => getExperienceYears(candidate.experience) >= minimumYears
      );
    }

    if (!Number.isNaN(maximumYears) && maxExperience !== "") {
      candidates = candidates.filter(
        (candidate) => getExperienceYears(candidate.experience) <= maximumYears
      );
    }

    if (!Number.isNaN(contactAgeDays) && contactAge !== "") {
      const thresholdMs = contactAgeDays * 24 * 60 * 60 * 1000;

      candidates = candidates.filter((candidate) => {
        if (!candidate.lastContacted) {
          return true;
        }

        const lastContacted = new Date(candidate.lastContacted);

        if (Number.isNaN(lastContacted.getTime())) {
          return true;
        }

        return Date.now() - lastContacted.getTime() >= thresholdMs;
      });
    }

    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

app.put("/candidate/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = "New", remarks = "", lastContacted } = req.body;

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status value."
      });
      return;
    }

    const updateData = {
      status,
      remarks: remarks.trim()
    };

    if (lastContacted) {
      updateData.lastContacted = new Date(lastContacted);
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).lean();

    if (!updatedCandidate) {
      res.status(404).json({
        success: false,
        message: "Candidate not found."
      });
      return;
    }

    res.json({
      success: true,
      message: "Candidate updated",
      candidate: updatedCandidate
    });
  } catch (error) {
    next(error);
  }
});

app.post("/upload", upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Please upload a file." });
      return;
    }

    const extractedText = await extractResumeText(req.file);

    if (!extractedText) {
      throw new Error("Could not extract readable text from this resume.");
    }

    const parsedData = await parseResumeWithOpenAI(extractedText);
    const saveResult = await saveCandidate(parsedData, req.body.uploadedBy);

    res.json({
      success: true,
      fileName: req.file.filename,
      message: saveResult.status,
      ...saveResult.candidate
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message: "File size must be 5MB or less."
      });
      return;
    }
  }

  res.status(400).json({
    success: false,
    message: error.message || "File upload failed."
  });
});

const startServer = async () => {
  try {
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in the environment.");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
