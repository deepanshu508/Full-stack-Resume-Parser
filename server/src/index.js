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
import Client from "./models/Client.js";
import Job from "./models/Job.js";
import Project from "./models/Project.js";

dotenv.config();

const app = express();
app.get("/", (req, res) => {
  res.send("Resume Parser API is running 🚀");
});
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI;
console.log("Mongo URI:", mongoUri);
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
app.use("/uploads", express.static(uploadsDir));

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

const saveCandidate = async (parsedData, uploadedBy, jobId, resumeUrl) => {
  const candidateData = {
    name: parsedData.name?.trim() || "",
    phone: normalizePhone(parsedData.phone),
    location: parsedData.location?.trim() || "",
    uploadedBy: uploadedBy?.trim() || "",
    job_id: jobId,
    status: "New",
    remarks: "",
    skills: Array.isArray(parsedData.skills)
      ? [...new Set(parsedData.skills.map((skill) => skill.trim()).filter(Boolean))]
      : [],
    experience: parsedData.experience?.trim() || "",
    resume_url: resumeUrl || ""
  };

  if (!candidateData.phone) {
    throw new Error("Phone number is required.");
  }

  if (!candidateData.uploadedBy) {
    throw new Error("Uploader name or email is required.");
  }

  if (!candidateData.job_id) {
    throw new Error("Job is required.");
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
      job_id: savedCandidate.job_id,
      status: savedCandidate.status,
      remarks: savedCandidate.remarks,
      lastContacted: savedCandidate.lastContacted,
      skills: savedCandidate.skills,
      experience: savedCandidate.experience,
      resume_url: savedCandidate.resume_url
    }
  };
};

app.get("/health", (_req, res) => {
  res.send("Server running");
});

app.post("/projects", async (req, res, next) => {
  try {
    const project = await Project.create({
      name: req.body.name?.trim(),
      client_name: req.body.client_name?.trim() || "",
      role: req.body.role?.trim() || "",
      location: req.body.location?.trim() || ""
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

app.get("/projects", async (_req, res, next) => {
  try {
    const projects = await Project.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "_id",
          foreignField: "project_id",
          as: "jobs"
        }
      },
      {
        $lookup: {
          from: "candidates",
          let: {
            jobIds: "$jobs._id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$job_id", "$$jobIds"]
                }
              }
            }
          ],
          as: "candidates"
        }
      },
      {
        $project: {
          name: 1,
          client_name: 1,
          role: 1,
          location: 1,
          created_at: 1,
          candidatesCount: { $size: "$candidates" }
        }
      },
      {
        $sort: {
          created_at: -1
        }
      }
    ]);

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

app.get("/projects/:projectId", async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId).lean();

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found."
      });
      return;
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
});

app.get("/projects/:projectId/candidates", async (req, res, next) => {
  try {
    const jobs = await Job.find({ project_id: req.params.projectId }).select("_id").lean();
    const jobIds = jobs.map((job) => job._id);
    const candidates = await Candidate.find({ job_id: { $in: jobIds } }).sort({
      createdAt: -1
    }).lean();

    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

app.post("/projects/:projectId/jobs", async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId).lean();

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found."
      });
      return;
    }

    const job = await Job.create({
      project_id: req.params.projectId,
      title: req.body.title?.trim(),
      location: req.body.location?.trim() || "",
      min_experience: Number(req.body.min_experience) || 0,
      max_experience: Number(req.body.max_experience) || 0,
      skills: Array.isArray(req.body.skills)
        ? req.body.skills.map((skill) => skill.trim()).filter(Boolean)
        : []
    });

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

app.get("/projects/:projectId/jobs", async (req, res, next) => {
  try {
    const jobs = await Job.aggregate([
      {
        $match: {
          project_id: new mongoose.Types.ObjectId(req.params.projectId)
        }
      },
      {
        $lookup: {
          from: "candidates",
          localField: "_id",
          foreignField: "job_id",
          as: "candidates"
        }
      },
      {
        $project: {
          title: 1,
          location: 1,
          min_experience: 1,
          max_experience: 1,
          skills: 1,
          created_at: 1,
          candidatesCount: { $size: "$candidates" }
        }
      },
      {
        $sort: {
          created_at: -1
        }
      }
    ]);

    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

app.get("/projects/:projectId/jobs/:jobId", async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      project_id: req.params.projectId
    }).lean();

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Job not found."
      });
      return;
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
});

app.get("/projects/:projectId/jobs/:jobId/candidates", async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ job_id: req.params.jobId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

app.post("/clients", async (req, res, next) => {
  try {
    const client = await Client.create({
      name: req.body.name?.trim(),
      industry: req.body.industry?.trim() || "",
      contact_person: req.body.contact_person?.trim() || "",
      email: req.body.email?.trim() || ""
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

app.get("/clients", async (_req, res, next) => {
  try {
    const clients = await Client.find().sort({ created_at: -1 }).lean();
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

app.post("/jobs", async (req, res, next) => {
  try {
    const job = await Job.create({
      project_id: req.body.project_id,
      title: req.body.title?.trim(),
      location: req.body.location?.trim() || "",
      min_experience: Number(req.body.min_experience) || 0,
      max_experience: Number(req.body.max_experience) || 0,
      skills: Array.isArray(req.body.skills)
        ? req.body.skills.map((skill) => skill.trim()).filter(Boolean)
        : []
    });

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

app.get("/clients/:clientId/jobs", async (req, res, next) => {
  try {
    res.json([]);
  } catch (error) {
    next(error);
  }
});

app.get("/candidates", async (req, res, next) => {
  try {
    const {
      skills = "",
      minExperience = "",
      maxExperience = "",
      status = "",
      project_id = "",
      job_id = ""
    } = req.query;
    const candidateQuery = {};

    if (status && allowedStatuses.includes(status)) {
      candidateQuery.status = status;
    }

    if (job_id) {
      candidateQuery.job_id = job_id;
    } else if (project_id) {
      const projectJobs = await Job.find({ project_id }).select("_id").lean();
      candidateQuery.job_id = { $in: projectJobs.map((job) => job._id) };
    }

    if (skills) {
      candidateQuery.skills = { $elemMatch: { $regex: skills, $options: "i" } };
    }

    let candidates = await Candidate.find(candidateQuery)
      .populate({
        path: "job_id",
        select: "title project_id",
        populate: {
          path: "project_id",
          select: "name"
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    const minimumYears = Number(minExperience);
    const maximumYears = Number(maxExperience);

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

    res.json(
      candidates.map((candidate) => ({
        ...candidate,
        projectName: candidate.job_id?.project_id?.name || "",
        jobTitle: candidate.job_id?.title || ""
      }))
    );
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

    const { uploadedBy, job_id: jobId } = req.body;
    const job = await Job.findById(jobId).lean();

    if (!job) {
      throw new Error("Selected job was not found.");
    }

    const resumeUrl = `/uploads/${req.file.filename}`;
    const parsedData = await parseResumeWithOpenAI(extractedText);
    const saveResult = await saveCandidate(parsedData, uploadedBy, jobId, resumeUrl);

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
