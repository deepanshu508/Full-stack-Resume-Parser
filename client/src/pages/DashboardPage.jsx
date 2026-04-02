export default function DashboardPage({
  candidates,
  filters,
  handleFilterChange,
  isLoadingCandidates,
  selectedWhatsAppTemplate,
  setSelectedWhatsAppTemplate,
  whatsAppTemplateOptions,
  contactAgeOptions,
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
  );
}
