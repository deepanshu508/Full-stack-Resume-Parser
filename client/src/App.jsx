import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ManagePage from "./pages/ManagePage";
import UploadPage from "./pages/UploadPage";

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
  const [clientForm, setClientForm] = useState({
    name: "",
    industry: "",
    contact_person: "",
    email: ""
  });
  const [jobForm, setJobForm] = useState({
    title: "",
    client_id: "",
    location: "",
    min_experience: "",
    max_experience: "",
    skills: "",
    description: ""
  });
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);
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
    } catch (_error) {
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
      } catch (_error) {
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

  const handleClientFormChange = (event) => {
    setClientForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleJobFormChange = (event) => {
    setJobForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleCreateClient = async (event) => {
    event.preventDefault();

    if (!clientForm.name.trim()) {
      setUploadMessage("Client name is required.");
      return;
    }

    try {
      setIsSavingClient(true);
      setUploadMessage("");

      const response = await fetch(`${apiUrl}/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: clientForm.name,
          industry: clientForm.industry,
          contact_person: clientForm.contact_person,
          email: clientForm.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save client.");
      }

      await fetchClients();
      setSelectedClientId(data._id);
      setSelectedJobId("");
      setJobs([]);
      setClientForm({
        name: "",
        industry: "",
        contact_person: "",
        email: ""
      });
      setJobForm((current) => ({
        ...current,
        client_id: data._id
      }));
      setUploadMessage("Client saved successfully.");
    } catch (error) {
      setUploadMessage(error.message || "Could not save client.");
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();

    if (!jobForm.title.trim()) {
      setUploadMessage("Job title is required.");
      return;
    }

    if (!jobForm.client_id) {
      setUploadMessage("Please select a client for the job.");
      return;
    }

    try {
      setIsSavingJob(true);
      setUploadMessage("");

      const response = await fetch(`${apiUrl}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: jobForm.title,
          client_id: jobForm.client_id,
          location: jobForm.location,
          min_experience: jobForm.min_experience,
          max_experience: jobForm.max_experience,
          skills: jobForm.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
          description: jobForm.description
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save job.");
      }

      if (selectedClientId === jobForm.client_id) {
        await fetchJobsByClient(jobForm.client_id);
        setSelectedJobId(data._id);
      }

      setJobForm({
        title: "",
        client_id: jobForm.client_id,
        location: "",
        min_experience: "",
        max_experience: "",
        skills: "",
        description: ""
      });
      setUploadMessage("Job saved successfully.");
    } catch (error) {
      setUploadMessage(error.message || "Could not save job.");
    } finally {
      setIsSavingJob(false);
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
        <p>
          Step 1: Create a Client and Job in Manage section
          <br />
          Step 2: Upload candidates in Upload section
          <br />
          Step 3: View candidates in Dashboard
        </p>

        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>{" "}
          <NavLink to="/manage">Clients & Jobs</NavLink>{" "}
          <NavLink to="/upload">Upload Candidate</NavLink>
        </nav>

        {uploadMessage ? <p className="upload-message">{uploadMessage}</p> : null}

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                candidates={candidates}
                filters={filters}
                handleFilterChange={handleFilterChange}
                isLoadingCandidates={isLoadingCandidates}
                selectedWhatsAppTemplate={selectedWhatsAppTemplate}
                setSelectedWhatsAppTemplate={setSelectedWhatsAppTemplate}
                whatsAppTemplateOptions={whatsAppTemplateOptions}
                contactAgeOptions={contactAgeOptions}
                statusOptions={statusOptions}
                selectedCandidateIds={selectedCandidateIds}
                areAllSelectableCandidatesSelected={areAllSelectableCandidatesSelected}
                handleSelectAllCandidates={handleSelectAllCandidates}
                handleBulkWhatsApp={handleBulkWhatsApp}
                getWhatsAppLink={getWhatsAppLink}
                formatLastContacted={formatLastContacted}
                isContactStale={isContactStale}
                handleCandidateSelect={handleCandidateSelect}
                handleCandidateFieldChange={handleCandidateFieldChange}
                updatingCandidateId={updatingCandidateId}
                handleCandidateUpdate={handleCandidateUpdate}
                handleSingleWhatsApp={handleSingleWhatsApp}
              />
            }
          />
          <Route
            path="/manage"
            element={
              <ManagePage
                clientForm={clientForm}
                handleClientFormChange={handleClientFormChange}
                handleCreateClient={handleCreateClient}
                isSavingClient={isSavingClient}
                jobForm={jobForm}
                handleJobFormChange={handleJobFormChange}
                handleCreateJob={handleCreateJob}
                isSavingJob={isSavingJob}
                clients={clients}
              />
            }
          />
          <Route
            path="/upload"
            element={
              <UploadPage
                message={message}
                uploadedBy={uploadedBy}
                setUploadedBy={setUploadedBy}
                clients={clients}
                selectedClientId={selectedClientId}
                setSelectedClientId={setSelectedClientId}
                jobs={jobs}
                selectedJobId={selectedJobId}
                setSelectedJobId={setSelectedJobId}
                fetchJobsByClient={fetchJobsByClient}
                file={file}
                setFile={setFile}
                handleSubmit={handleSubmit}
                isUploading={isUploading}
                uploadMessage=""
                parsedResume={parsedResume}
              />
            }
          />
        </Routes>
      </div>
    </main>
  );
}
