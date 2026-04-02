import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export default function ProjectDetailPage({
  apiUrl,
  serverMessage,
  statusOptions,
  whatsAppTemplateOptions,
  getWhatsAppLink,
  formatLastContacted,
  isContactStale
}) {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [uploadedBy, setUploadedBy] = useState("");
  const [file, setFile] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [updatingCandidateId, setUpdatingCandidateId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [parsedResume, setParsedResume] = useState(null);
  const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState(
    "interviewInvite"
  );

  const fetchProjectDetails = async () => {
    try {
      setIsLoadingProject(true);

      const [projectResponse, candidatesResponse] = await Promise.all([
        fetch(`${apiUrl}/projects/${projectId}`),
        fetch(`${apiUrl}/projects/${projectId}/candidates`)
      ]);

      const projectData = await projectResponse.json();
      const candidatesData = await candidatesResponse.json();

      if (!projectResponse.ok) {
        throw new Error(projectData.message || "Could not load project.");
      }

      if (!candidatesResponse.ok) {
        throw new Error(candidatesData.message || "Could not load candidates.");
      }

      setProject(projectData);
      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);
    } catch (error) {
      setProject(null);
      setCandidates([]);
      setUploadMessage(error.message || "Could not load project.");
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

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

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("uploadedBy", uploadedBy.trim());
    formData.append("project_id", projectId);

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
        uploadedBy: data.uploadedBy || uploadedBy.trim(),
        status: data.status || "New",
        remarks: data.remarks || "",
        lastContacted: data.lastContacted || null,
        skills: Array.isArray(data.skills) ? data.skills : [],
        experience: data.experience || ""
      });
      setFile(null);
      event.target.reset();
      await fetchProjectDetails();
    } catch (error) {
      setUploadMessage(error.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
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
      setUploadMessage("Candidate updated.");
    } catch (error) {
      setUploadMessage(error.message || "Could not update candidate.");
    } finally {
      setUpdatingCandidateId("");
    }
  };

  const handleSingleWhatsApp = async (candidate, link) => {
    try {
      const response = await fetch(`${apiUrl}/candidate/${candidate._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: candidate.status || "New",
          remarks: candidate.remarks || "",
          lastContacted: new Date().toISOString()
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
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (error) {
      setUploadMessage(error.message || "Could not update last contacted date.");
    }
  };

  return (
    <div className="container">
      <section className="card upload-card">
        <h1>Project Detail</h1>
        <p className="status">{serverMessage}</p>

        <p>
          <Link to="/projects">Back to Projects</Link>
        </p>

        {isLoadingProject ? (
          <p>Loading project...</p>
        ) : project ? (
          <>
            <p><strong>Project:</strong> {project.name || "-"}</p>
            <p><strong>Role:</strong> {project.role || "-"}</p>
            <p><strong>Client:</strong> {project.client_name || "-"}</p>
            <p><strong>Location:</strong> {project.location || "-"}</p>

            <button type="button" onClick={() => setShowUploadForm((current) => !current)}>
              {showUploadForm ? "Hide Upload Form" : "Upload Candidate"}
            </button>

            {showUploadForm ? (
              <form className="upload-form" onSubmit={handleSubmit}>
                <label htmlFor="uploadedBy">Your name or email</label>
                <input
                  id="uploadedBy"
                  type="text"
                  placeholder="recruiter@example.com"
                  value={uploadedBy}
                  onChange={(event) => setUploadedBy(event.target.value)}
                />
                <label htmlFor="resume">Upload resume</label>
                <input
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <button type="submit" disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
              </form>
            ) : null}

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
          </>
        ) : (
          <p>Project not found.</p>
        )}
      </section>

      <section className="card dashboard-card">
        <div className="dashboard-header">
          <h2>Project Candidates</h2>
          <p>{isLoadingProject ? "Loading candidates..." : `${candidates.length} result(s)`}</p>
        </div>

        <div className="filters">
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

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
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

                  return (
                    <tr key={candidate._id} className={isContactStale(candidate.lastContacted) ? "stale-row" : ""}>
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
                  <td colSpan="11" className="empty-state">
                    {isLoadingProject ? "Loading..." : "No candidates found for this project yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
