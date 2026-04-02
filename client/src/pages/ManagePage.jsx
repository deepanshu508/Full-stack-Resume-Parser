export default function ManagePage({
  clientForm,
  handleClientFormChange,
  handleCreateClient,
  isSavingClient,
  jobForm,
  handleJobFormChange,
  handleCreateJob,
  isSavingJob,
  clients
}) {
  return (
    <>
      <section className="card upload-card">
        <h1>Clients & Jobs</h1>

        <form className="upload-form" onSubmit={handleCreateClient}>
          <label htmlFor="client-name">Client Name</label>
          <input
            id="client-name"
            name="name"
            type="text"
            value={clientForm.name}
            onChange={handleClientFormChange}
          />
          <label htmlFor="client-industry">Industry</label>
          <input
            id="client-industry"
            name="industry"
            type="text"
            value={clientForm.industry}
            onChange={handleClientFormChange}
          />
          <label htmlFor="client-contact-person">Contact Person</label>
          <input
            id="client-contact-person"
            name="contact_person"
            type="text"
            value={clientForm.contact_person}
            onChange={handleClientFormChange}
          />
          <label htmlFor="client-email">Email</label>
          <input
            id="client-email"
            name="email"
            type="email"
            value={clientForm.email}
            onChange={handleClientFormChange}
          />
          <button type="submit" disabled={isSavingClient}>
            {isSavingClient ? "Saving..." : "Save Client"}
          </button>
        </form>
      </section>

      <section className="card upload-card">
        <form className="upload-form" onSubmit={handleCreateJob}>
          <label htmlFor="job-title">Job Title</label>
          <input
            id="job-title"
            name="title"
            type="text"
            value={jobForm.title}
            onChange={handleJobFormChange}
          />
          <label htmlFor="job-client">Select Client</label>
          <select
            id="job-client"
            className="filter-select"
            name="client_id"
            value={jobForm.client_id}
            onChange={handleJobFormChange}
          >
            <option value="">Choose client</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
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
          <label htmlFor="job-description">Description</label>
          <input
            id="job-description"
            name="description"
            type="text"
            value={jobForm.description}
            onChange={handleJobFormChange}
          />
          <button type="submit" disabled={isSavingJob}>
            {isSavingJob ? "Saving..." : "Save Job"}
          </button>
        </form>
      </section>
    </>
  );
}
