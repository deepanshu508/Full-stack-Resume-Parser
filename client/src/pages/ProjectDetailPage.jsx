import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export default function ProjectDetailPage({ apiUrl, serverMessage }) {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [jobForm, setJobForm] = useState({
    title: "",
    location: "",
    min_experience: "",
    max_experience: "",
    skills: ""
  });
  const [jobs, setJobs] = useState([]);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [pageMessage, setPageMessage] = useState("");

  const fetchProjectDetails = async () => {
    try {
      setIsLoadingProject(true);

      const [projectResponse, jobsResponse] = await Promise.all([
        fetch(`${apiUrl}/projects/${projectId}`),
        fetch(`${apiUrl}/projects/${projectId}/jobs`)
      ]);

      const projectData = await projectResponse.json();
      const jobsData = await jobsResponse.json();

      if (!projectResponse.ok) {
        throw new Error(projectData.message || "Could not load project.");
      }

      if (!jobsResponse.ok) {
        throw new Error(jobsData.message || "Could not load jobs.");
      }

      setProject(projectData);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (error) {
      setProject(null);
      setJobs([]);
      setPageMessage(error.message || "Could not load project.");
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleJobFormChange = (event) => {
    setJobForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();

    if (!jobForm.title.trim()) {
      setPageMessage("Job title is required.");
      return;
    }

    try {
      setIsSavingJob(true);
      setPageMessage("");

      const response = await fetch(`${apiUrl}/projects/${projectId}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: jobForm.title,
          location: jobForm.location,
          min_experience: jobForm.min_experience,
          max_experience: jobForm.max_experience,
          skills: jobForm.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save job.");
      }

      setJobForm({
        title: "",
        location: "",
        min_experience: "",
        max_experience: "",
        skills: ""
      });
      setPageMessage("Job saved successfully.");
      await fetchProjectDetails();
    } catch (error) {
      setPageMessage(error.message || "Could not save job.");
    } finally {
      setIsSavingJob(false);
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
          </>
        ) : (
          <p>Project not found.</p>
        )}

        {pageMessage ? <p className="upload-message">{pageMessage}</p> : null}
      </section>

      <section className="card upload-card">
        <h2>Add Job</h2>

        <form className="upload-form" onSubmit={handleCreateJob}>
          <label htmlFor="job-title">Job Title</label>
          <input
            id="job-title"
            name="title"
            type="text"
            value={jobForm.title}
            onChange={handleJobFormChange}
          />
          <label htmlFor="job-location">Location</label>
          <input
            id="job-location"
            name="location"
            type="text"
            value={jobForm.location}
            onChange={handleJobFormChange}
          />
          <label htmlFor="job-min-experience">Min Experience</label>
          <input
            id="job-min-experience"
            name="min_experience"
            type="number"
            min="0"
            step="0.5"
            value={jobForm.min_experience}
            onChange={handleJobFormChange}
          />
          <label htmlFor="job-max-experience">Max Experience</label>
          <input
            id="job-max-experience"
            name="max_experience"
            type="number"
            min="0"
            step="0.5"
            value={jobForm.max_experience}
            onChange={handleJobFormChange}
          />
          <label htmlFor="job-skills">Skills</label>
          <input
            id="job-skills"
            name="skills"
            type="text"
            placeholder="React, Node.js"
            value={jobForm.skills}
            onChange={handleJobFormChange}
          />
          <button type="submit" disabled={isSavingJob}>
            {isSavingJob ? "Saving..." : "Save Job"}
          </button>
        </form>
      </section>

      <section className="card dashboard-card">
        <div className="dashboard-header">
          <h2>Jobs</h2>
          <p>{isLoadingProject ? "Loading jobs..." : `${jobs.length} result(s)`}</p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Location</th>
                <th>Min Experience</th>
                <th>Max Experience</th>
                <th>Skills</th>
                <th>Candidates Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length ? (
                jobs.map((job) => (
                  <tr key={job._id}>
                    <td>{job.title || "-"}</td>
                    <td>{job.location || "-"}</td>
                    <td>{job.min_experience ?? 0}</td>
                    <td>{job.max_experience ?? 0}</td>
                    <td>{job.skills?.length ? job.skills.join(", ") : "-"}</td>
                    <td>{job.candidatesCount || 0}</td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/projects/${projectId}/jobs/${job._id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    {isLoadingProject ? "Loading..." : "No jobs found for this project yet."}
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
