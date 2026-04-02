export default function DashboardPage({
  candidates,
  filters,
  handleFilterChange,
  isLoadingCandidates,
  projects,
  jobs,
  selectedProjectId,
  selectedJobId,
  jobSummaryCards,
  handleJobCardClick,
  selectedWhatsAppTemplate,
  setSelectedWhatsAppTemplate,
  whatsAppTemplateOptions,
  statusOptions,
  selectedCandidateIds,
  areAllSelectableCandidatesSelected,
  handleSelectAllCandidates,
  handleBulkWhatsApp,
  getWhatsAppLink,
  formatLastContacted,
  isContactStale,
  handleCandidateSelect,
  handleCandidateFieldChange,
  updatingCandidateId,
  handleCandidateUpdate,
  handleSingleWhatsApp
}) {
  return (
    <div className="container">
      <section className="card dashboard-card">
        <div className="dashboard-header">
          <h2>Candidates</h2>
          <p>{isLoadingCandidates ? "Loading candidates..." : `${candidates.length} result(s)`}</p>
        </div>

        <div className="filters">
          <select
            className="filter-select"
            name="project_id"
            value={filters.project_id}
            onChange={handleFilterChange}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            name="job_id"
            value={filters.job_id}
            onChange={handleFilterChange}
            disabled={!filters.project_id}
          >
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
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

        {selectedProjectId ? (
          <div className="filters">
            {jobSummaryCards.length ? (
              jobSummaryCards.map((job) => (
                <button
                  key={job._id}
                  className="table-button"
                  type="button"
                  onClick={() => handleJobCardClick(job._id)}
                  disabled={selectedJobId === job._id}
                >
                  {job.title || "Untitled Job"}
                  <br />
                  {job.location || "-"}
                  <br />
                  Total: {job.totalCandidates}
                  <br />
                  Shortlisted: {job.shortlistedCount}
                  <br />
                  Interview: {job.interviewCount}
                  <br />
                  Rejected: {job.rejectedCount}
                </button>
              ))
            ) : (
              <p className="empty-state">No jobs found for this project yet.</p>
            )}
          </div>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Project Name</th>
                <th>Job Title</th>
                <th>Location</th>
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
                      <td>{candidate.projectName || "-"}</td>
                      <td>{candidate.jobTitle || "-"}</td>
                      <td>{candidate.location || "-"}</td>
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
                  <td colSpan="13" className="empty-state">
                    {isLoadingCandidates
                      ? "Loading..."
                      : "No candidates found. Start by creating a project and job, then upload resumes."}
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
