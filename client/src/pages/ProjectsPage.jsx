import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ProjectsPage({ apiUrl, serverMessage }) {
  const [projectForm, setProjectForm] = useState({
    name: "",
    client_name: "",
    role: "",
    location: ""
  });
  const [projects, setProjects] = useState([]);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [message, setMessage] = useState("");

  const fetchProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const response = await fetch(`${apiUrl}/projects`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Could not load projects.");
      }

      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      setProjects([]);
      setMessage(error.message || "Could not load projects.");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectFormChange = (event) => {
    setProjectForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!projectForm.name.trim()) {
      setMessage("Project name is required.");
      return;
    }

    try {
      setIsSavingProject(true);
      setMessage("");

      const response = await fetch(`${apiUrl}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: projectForm.name,
          client_name: projectForm.client_name,
          role: projectForm.role,
          location: projectForm.location
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save project.");
      }

      setProjectForm({
        name: "",
        client_name: "",
        role: "",
        location: ""
      });
      setMessage("Project saved successfully.");
      await fetchProjects();
    } catch (error) {
      setMessage(error.message || "Could not save project.");
    } finally {
      setIsSavingProject(false);
    }
  };

  return (
    <div className="container">
      <section className="card upload-card">
        <h1>Projects</h1>
        <p className="status">{serverMessage}</p>

        <form className="upload-form" onSubmit={handleCreateProject}>
          <label htmlFor="project-name">Project Name</label>
          <input
            id="project-name"
            name="name"
            type="text"
            value={projectForm.name}
            onChange={handleProjectFormChange}
          />
          <label htmlFor="project-client-name">Client Name</label>
          <input
            id="project-client-name"
            name="client_name"
            type="text"
            value={projectForm.client_name}
            onChange={handleProjectFormChange}
          />
          <label htmlFor="project-role">Role</label>
          <input
            id="project-role"
            name="role"
            type="text"
            value={projectForm.role}
            onChange={handleProjectFormChange}
          />
          <label htmlFor="project-location">Location</label>
          <input
            id="project-location"
            name="location"
            type="text"
            value={projectForm.location}
            onChange={handleProjectFormChange}
          />
          <button type="submit" disabled={isSavingProject}>
            {isSavingProject ? "Saving..." : "Save Project"}
          </button>
        </form>

        {message ? <p className="upload-message">{message}</p> : null}
      </section>

      <section className="card dashboard-card">
        <div className="dashboard-header">
          <h2>Hiring Projects</h2>
          <p>{isLoadingProjects ? "Loading projects..." : `${projects.length} result(s)`}</p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Client</th>
                <th>Role</th>
                <th>Location</th>
                <th>Candidates Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.length ? (
                projects.map((project) => (
                  <tr key={project._id}>
                    <td>{project.name || "-"}</td>
                    <td>{project.client_name || "-"}</td>
                    <td>{project.role || "-"}</td>
                    <td>{project.location || "-"}</td>
                    <td>{project.candidatesCount || 0}</td>
                    <td>
                      <Link className="table-link" to={`/projects/${project._id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {isLoadingProjects
                      ? "Loading..."
                      : "No projects found. Create a project to start uploading candidates."}
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
