import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectsPage from "./pages/ProjectsPage";

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

  return Date.now() - date.getTime() >= 2 * 24 * 60 * 60 * 1000;
};

export default function App() {
  const [message, setMessage] = useState("Loading...");
  const [appMessage, setAppMessage] = useState("");
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
  }, []);

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
      setAppMessage("Candidate updated.");
    } catch (error) {
      setAppMessage(error.message || "Could not update candidate.");
    } finally {
      setUpdatingCandidateId("");
    }
  };

  const markCandidateContacted = async (candidate) => {
    const timestamp = new Date().toISOString();

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
      setAppMessage("Please select at least one candidate with a valid phone number.");
      return;
    }

    for (const candidate of candidatesWithLinks) {
      try {
        await markCandidateContacted(candidate);
      } catch (error) {
        setAppMessage(error.message || "Could not update last contacted date.");
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
    } catch (error) {
      setAppMessage(error.message || "Could not update last contacted date.");
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
          Step 1: Create a hiring project in Projects section
          <br />
          Step 2: Open the project and upload candidates
          <br />
          Step 3: View all candidates in Dashboard
        </p>

        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>{" "}
          <NavLink to="/projects">Projects</NavLink>
        </nav>

        {appMessage ? <p className="upload-message">{appMessage}</p> : null}

        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
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
            path="/projects"
            element={<ProjectsPage apiUrl={apiUrl} serverMessage={message} />}
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProjectDetailPage
                apiUrl={apiUrl}
                serverMessage={message}
                statusOptions={statusOptions}
                whatsAppTemplateOptions={whatsAppTemplateOptions}
                getWhatsAppLink={getWhatsAppLink}
                formatLastContacted={formatLastContacted}
                isContactStale={isContactStale}
              />
            }
          />
          <Route path="/manage" element={<Navigate to="/projects" replace />} />
          <Route path="/upload" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </main>
  );
}
