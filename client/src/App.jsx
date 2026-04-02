import { useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const statusOptions = [
  "New",
  "Contacted",
  "Interested",
  "Interview Scheduled",
  "Selected",
  "Joined",
  "Not Interested"
];
const whatsAppTemplates = {
  interviewInvite:
    "Hi {{name}}, we would like to invite you for an interview. Please let us know your availability.",
  followUp:
    "Hi {{name}}, following up on the job opportunity we shared earlier. Please let us know if you are interested.",
  jobOffer:
    "Hi {{name}}, we are excited to move forward with your profile and would like to discuss a job offer with you."
};
const whatsAppTemplateOptions = [
  { value: "interviewInvite", label: "Interview Invite" },
  { value: "followUp", label: "Follow-up" },
  { value: "jobOffer", label: "Job Offer" }
];
const contactAgeOptions = [
  { value: "", label: "Any contact status" },
  { value: "2", label: "Not contacted in 2+ days" },
  { value: "7", label: "Not contacted in 7+ days" }
];
const defaultCountryCode = "91";

const formatWhatsAppPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  return digits;
};

const getWhatsAppLink = (candidate, selectedTemplate) => {
  const phone = formatWhatsAppPhone(candidate.phone);

  if (!phone) {
    return "";
  }

  const template =
    whatsAppTemplates[selectedTemplate] || whatsAppTemplates.interviewInvite;
  const message = template.replaceAll("{{name}}", candidate.name || "there");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const formatLastContacted = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
};

const isContactStale = (value) => {
  if (!value) {
    return true;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  const diffInMs = Date.now() - date.getTime();
  return diffInMs >= 2 * 24 * 60 * 60 * 1000;
};

export default function App() {
  const [message, setMessage] = useState("Loading...");
  const [file, setFile] = useState(null);
  const [uploadedBy, setUploadedBy] = useState("");
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [parsedResume, setParsedResume] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filters, setFilters] = useState({
    location: "",
    skills: "",
    minExperience: "",
    maxExperience: "",
    status: "",
    uploadedBy: "",
    contactAge: ""
  });
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [updatingCandidateId, setUpdatingCandidateId] = useState("");
  const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState(
    "interviewInvite"
  );
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  const fetchClients = async () => {
    try {
      const response = await fetch(`${apiUrl}/clients`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Could not load clients.");
      }

      setClients(Array.isArray(data) ? data : []);
    } catch (_error) {
      setClients([]);
    }
  };

  const fetchJobsByClient = async (clientId) => {
    if (!clientId) {
      setJobs([]);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/clients/${clientId}/jobs`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Could not load jobs.");
      }

      setJobs(Array.isArray(data) ? data : []);
    } catch (_error) {
      setJobs([]);
    }
  };

  const fetchCandidates = async (nextFilters = filters) => {
    try {
      setIsLoadingCandidates(true);
      const params = new URLSearchParams();

      if (nextFilters.location.trim()) {
        params.set("location", nextFilters.location.trim());
      }

      if (nextFilters.skills.trim()) {
        params.set("skills", nextFilters.skills.trim());
      }

      if (nextFilters.minExperience !== "") {
        params.set("minExperience", nextFilters.minExperience);
      }

      if (nextFilters.maxExperience !== "") {
        params.set("maxExperience", nextFilters.maxExperience);
      }

      if (nextFilters.status) {
        params.set("status", nextFilters.status);
      }

      if (nextFilters.uploadedBy.trim()) {
        params.set("uploadedBy", nextFilters.uploadedBy.trim());
      }

      if (nextFilters.contactAge) {
        params.set("contactAge", nextFilters.contactAge);
      }

      const query = params.toString();
      const response = await fetch(
        `${apiUrl}/candidates${query ? `?${query}` : ""}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Could not load candidates.");
      }

      const nextCandidates = Array.isArray(data) ? data : [];
      setCandidates(nextCandidates);
      setSelectedCandidateIds((currentIds) =>
        currentIds.filter((id) =>
          nextCandidates.some((candidate) => candidate._id === id)
        )
      );
    } catch (error) {
      setCandidates([]);
      setSelectedCandidateIds([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`);
        const text = await response.text();
        setMessage(text);
      } catch (error) {
        setMessage("Unable to reach server");
      }
    };

    fetchHealth();
    fetchCandidates();
    fetchClients();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      setUploadMessage("Please choose a file first.");
      return;
    }

    if (!uploadedBy.trim()) {
      setUploadMessage("Please enter your name or email.");
      return;
    }

    if (!selectedClientId) {
      setUploadMessage("Please select a client.");
      return;
    }

    if (!selectedJobId) {
      setUploadMessage("Please select a job.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("uploadedBy", uploadedBy.trim());
    formData.append("client_id", selectedClientId);
    formData.append("job_id", selectedJobId);

    try {
      setIsUploading(true);
      setUploadMessage("");
      setParsedResume(null);

      const response = await fetch(`${apiUrl}/upload`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      setUploadMessage(`${data.message}: ${data.fileName}`);
      setParsedResume({
        name: data.name || "",
        phone: data.phone || "",
        location: data.location || "",
        uploadedBy: data.uploadedBy || "",
        status: data.status || "New",
        remarks: data.remarks || "",
        lastContacted: data.lastContacted || null,
        skills: Array.isArray(data.skills) ? data.skills : [],
        experience: data.experience || ""
      });
      setFile(null);
      event.target.reset();
      fetchCandidates();
    } catch (error) {
      setUploadMessage(error.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilterChange = (event) => {
    const nextFilters = {
      ...filters,
      [event.target.name]: event.target.value
    };

    setFilters(nextFilters);
    fetchCandidates(nextFilters);
  };

  const handleCandidateFieldChange = (candidateId, field, value) => {
    setCandidates((currentCandidates) =>
      currentCandidates.map((candidate) =>
        candidate._id === candidateId ? { ...candidate, [field]: value } : candidate
      )
    );
  };

  const handleCandidateUpdate = async (candidate) => {
    try {
      setUpdatingCandidateId(candidate._id);

      const response = await fetch(`${apiUrl}/candidate/${candidate._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: candidate.status,
          remarks: candidate.remarks || ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update candidate.");
      }

      setCandidates((currentCandidates) =>
        currentCandidates.map((item) =>
          item._id === candidate._id ? data.candidate : item
        )
      );
    } catch (error) {
      setUploadMessage(error.message || "Could not update candidate.");
    } finally {
      setUpdatingCandidateId("");
    }
  };

  const markCandidateContacted = async (candidate) => {
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch(`${apiUrl}/candidate/${candidate._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: candidate.status || "New",
          remarks: candidate.remarks || "",
          lastContacted: timestamp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update last contacted date.");
      }

      setCandidates((currentCandidates) =>
        currentCandidates.map((item) =>
          item._id === candidate._id ? data.candidate : item
        )
      );
    } catch (error) {
      setUploadMessage(error.message || "Could not update last contacted date.");
      throw error;
    }
  };

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidateIds((currentIds) =>
      currentIds.includes(candidateId)
        ? currentIds.filter((id) => id !== candidateId)
        : [...currentIds, candidateId]
    );
  };

  const handleSelectAllCandidates = () => {
    const selectableIds = candidates
      .filter((candidate) => getWhatsAppLink(candidate, selectedWhatsAppTemplate))
      .map((candidate) => candidate._id);

    if (!selectableIds.length) {
      return;
    }

    setSelectedCandidateIds((currentIds) =>
      selectableIds.every((id) => currentIds.includes(id)) ? [] : selectableIds
    );
  };

  const handleBulkWhatsApp = async () => {
    const selectedCandidates = candidates.filter((candidate) =>
      selectedCandidateIds.includes(candidate._id)
    );
    const candidatesWithLinks = selectedCandidates.filter((candidate) =>
      getWhatsAppLink(candidate, selectedWhatsAppTemplate)
    );

    if (!candidatesWithLinks.length) {
      setUploadMessage("Please select at least one candidate with a valid phone number.");
      return;
    }

    for (const candidate of candidatesWithLinks) {
      try {
        await markCandidateContacted(candidate);
      } catch (_error) {
        return;
      }
    }

    candidatesWithLinks.forEach((candidate, index) => {
      const link = getWhatsAppLink(candidate, selectedWhatsAppTemplate);

      window.setTimeout(() => {
        window.open(link, "_blank", "noopener,noreferrer");
      }, index * 250);
    });
  };

  const handleSingleWhatsApp = async (candidate, link) => {
    try {
      await markCandidateContacted(candidate);
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (_error) {
      return;
    }
  };

  const selectableCandidateIds = candidates
    .filter((candidate) => getWhatsAppLink(candidate, selectedWhatsAppTemplate))
    .map((candidate) => candidate._id);
  const areAllSelectableCandidatesSelected =
    selectableCandidateIds.length > 0 &&
    selectableCandidateIds.every((id) => selectedCandidateIds.includes(id));

  return (
    <main className="app">
      <div className="layout">
        <section className="card upload-card">
          <h1>Candidate Dashboard</h1>
          <p className="status">{message}</p>

          <form className="upload-form" onSubmit={handleSubmit}>
            <label htmlFor="uploadedBy">Your name or email</label>
            <input
              id="uploadedBy"
              type="text"
              placeholder="recruiter@example.com"
              value={uploadedBy}
              onChange={(event) => {
                setUploadedBy(event.target.value);
                setUploadMessage("");
              }}
            />
            <label htmlFor="client">Select client</label>
            <select
              id="client"
              className="filter-select"
              value={selectedClientId}
              onChange={(event) => {
                const clientId = event.target.value;
                setSelectedClientId(clientId);
                setSelectedJobId("");
                setUploadMessage("");
                fetchJobsByClient(clientId);
              }}
            >
              <option value="">Choose client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name}
                </option>
              ))}
            </select>
            <label htmlFor="job">Select job</label>
            <select
              id="job"
              className="filter-select"
              value={selectedJobId}
              onChange={(event) => {
                setSelectedJobId(event.target.value);
                setUploadMessage("");
              }}
              disabled={!selectedClientId}
            >
              <option value="">Choose job</option>
              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}
            </select>
            <label htmlFor="resume">Upload resume</label>
            <input
              id="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setUploadMessage("");
              }}
            />
            <button type="submit" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </form>

          {uploadMessage ? <p className="upload-message">{uploadMessage}</p> : null}

          {parsedResume ? (
            <section className="result">
              <h2>Latest Parsed Resume</h2>
              <p><strong>Name:</strong> {parsedResume.name || "-"}</p>
              <p><strong>Phone:</strong> {parsedResume.phone || "-"}</p>
              <p><strong>Location:</strong> {parsedResume.location || "-"}</p>
              <p><strong>Uploaded By:</strong> {parsedResume.uploadedBy || "-"}</p>
              <p><strong>Status:</strong> {parsedResume.status || "New"}</p>
              <p><strong>Remarks:</strong> {parsedResume.remarks || "-"}</p>
              <p><strong>Experience:</strong> {parsedResume.experience || "-"}</p>
              <p><strong>Skills:</strong> {parsedResume.skills?.length ? parsedResume.skills.join(", ") : "-"}</p>
            </section>
          ) : null}
        </section>

        <section className="card dashboard-card">
          <div className="dashboard-header">
            <h2>Candidates</h2>
            <p>{isLoadingCandidates ? "Loading candidates..." : `${candidates.length} result(s)`}</p>
          </div>

          <div className="filters">
            <input
              name="location"
              type="text"
              placeholder="Search by location"
              value={filters.location}
              onChange={handleFilterChange}
            />
            <input
              name="skills"
              type="text"
              placeholder="Search by skill"
              value={filters.skills}
              onChange={handleFilterChange}
            />
            <input
              name="minExperience"
              type="number"
              min="0"
              step="0.5"
              placeholder="Min years"
              value={filters.minExperience}
              onChange={handleFilterChange}
            />
            <input
              name="maxExperience"
              type="number"
              min="0"
              step="0.5"
              placeholder="Max years"
              value={filters.maxExperience}
              onChange={handleFilterChange}
            />
            <select
              className="filter-select"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              name="uploadedBy"
              type="text"
              placeholder="Uploaded by"
              value={filters.uploadedBy}
              onChange={handleFilterChange}
            />
            <select
              className="filter-select"
              name="contactAge"
              value={filters.contactAge}
              onChange={handleFilterChange}
            >
              {contactAgeOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={selectedWhatsAppTemplate}
              onChange={(event) => setSelectedWhatsAppTemplate(event.target.value)}
            >
              {whatsAppTemplateOptions.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bulk-actions">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={areAllSelectableCandidatesSelected}
                onChange={handleSelectAllCandidates}
              />
              <span>Select All</span>
            </label>

            <button
              className="bulk-button"
              type="button"
              onClick={handleBulkWhatsApp}
              disabled={!selectedCandidateIds.length}
            >
              Send WhatsApp
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Uploaded By</th>
                  <th>Last Contacted</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Skills</th>
                  <th>Experience</th>
                  <th>Action</th>
                  <th>WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length ? (
                  candidates.map((candidate) => {
                    const whatsAppLink = getWhatsAppLink(
                      candidate,
                      selectedWhatsAppTemplate
                    );
                    const staleContact = isContactStale(candidate.lastContacted);

                    return (
                      <tr
                        key={candidate._id || candidate.phone || `${candidate.name}-${candidate.createdAt}`}
                        className={staleContact ? "stale-row" : ""}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedCandidateIds.includes(candidate._id)}
                            disabled={!whatsAppLink}
                            onChange={() => handleCandidateSelect(candidate._id)}
                          />
                        </td>
                        <td>{candidate.name || "-"}</td>
                        <td>{candidate.phone || "-"}</td>
                        <td>{candidate.location || "-"}</td>
                        <td>{candidate.uploadedBy || "-"}</td>
                        <td>{formatLastContacted(candidate.lastContacted)}</td>
                        <td>
                          <select
                            className="table-control"
                            value={candidate.status || "New"}
                            onChange={(event) =>
                              handleCandidateFieldChange(
                                candidate._id,
                                "status",
                                event.target.value
                              )
                            }
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="table-control"
                            type="text"
                            placeholder="Add remarks"
                            value={candidate.remarks || ""}
                            onChange={(event) =>
                              handleCandidateFieldChange(
                                candidate._id,
                                "remarks",
                                event.target.value
                              )
                            }
                          />
                        </td>
                        <td>{candidate.skills?.length ? candidate.skills.join(", ") : "-"}</td>
                        <td>{candidate.experience || "-"}</td>
                        <td>
                          <button
                            className="table-button"
                            type="button"
                            disabled={updatingCandidateId === candidate._id}
                            onClick={() => handleCandidateUpdate(candidate)}
                          >
                            {updatingCandidateId === candidate._id ? "Updating..." : "Update"}
                          </button>
                        </td>
                        <td>
                          {whatsAppLink ? (
                            <a
                              className="table-link"
                              href={whatsAppLink}
                              onClick={async (event) => {
                                event.preventDefault();
                                await handleSingleWhatsApp(candidate, whatsAppLink);
                              }}
                            >
                              WhatsApp
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" className="empty-state">
                      {isLoadingCandidates ? "Loading..." : "No candidates found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
