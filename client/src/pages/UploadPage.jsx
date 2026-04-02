export default function UploadPage({
  message,
  uploadedBy,
  setUploadedBy,
  clients,
  selectedClientId,
  setSelectedClientId,
  jobs,
  selectedJobId,
  setSelectedJobId,
  fetchJobsByClient,
  file,
  setFile,
  handleSubmit,
  isUploading,
  uploadMessage,
  parsedResume
}) {
  return (
    <section className="card upload-card">
      <h1>Upload Candidate</h1>
      <p className="status">{message}</p>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label htmlFor="uploadedBy">Your name or email</label>
        <input
          id="uploadedBy"
          type="text"
          placeholder="recruiter@example.com"
          value={uploadedBy}
          onChange={(event) => setUploadedBy(event.target.value)}
        />
        <label htmlFor="client">Select Client</label>
        <select
          id="client"
          className="filter-select"
          value={selectedClientId}
          onChange={(event) => {
            const clientId = event.target.value;
            setSelectedClientId(clientId);
            setSelectedJobId("");
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
        <label htmlFor="job">Select Job</label>
        <select
          id="job"
          className="filter-select"
          value={selectedJobId}
          onChange={(event) => setSelectedJobId(event.target.value)}
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
          onChange={(event) => setFile(event.target.files?.[0] || null)}
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
  );
}
