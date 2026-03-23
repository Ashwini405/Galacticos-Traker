import Layout from "../components/Layout";
import { useEffect, useState, useRef, useContext } from "react";
import { apiFetch } from "../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Link } from "react-router-dom";
import KanbanBoard from "../components/KanbanBoard";
import CandidateModal from "../components/CandidateModalFixed";
import { AuthContext } from "../context/AuthContext";

export default function Candidates() {
  const t = (key) => key;
  const { user } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState("table");
  const fileInputRef = useRef(null);
  const [data, setData] = useState([]);

  // --- CLIENT FEEDBACK STATE ---
  const [clientFeedbackModal, setClientFeedbackModal] = useState(null);
  const [clientStatus, setClientStatus] = useState("Pending");
  const [clientFeedback, setClientFeedback] = useState("");

  // --- RESUME VIEWER STATE ---
  const [resumeViewerUrl, setResumeViewerUrl] = useState(null);

  // --- VIEW CANDIDATE STATE ---
  const [viewCandidate, setViewCandidate] = useState(null);

  const [masterData, setMasterData] = useState({
    job_roles: [],
    clients: [],
    funnel_stages: [],
    contract_types: [],
    office_modes: [],
    recruiters: []
  });

  // persisted values that are sent to the backend
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    role_id: "",
    recruiter_id: "",
    client_id: "",
    stage_id: "",
    experience: ""
  });

  // values reflected in inputs until user clicks Apply
  const [pendingFilters, setPendingFilters] = useState({
    search: "",
    role_id: "",
    recruiter_id: "",
    client_id: "",
    stage_id: "",
    experience: ""
  });

  const [sortBy, setSortBy] = useState("newest");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/master-data")
      .then(res => res.json())
      .then(resData => setMasterData(resData))
      .catch(err => console.error(err));
  }, []);

  const fetchCandidates = (page = 1) => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (appliedFilters.search) queryParams.append('search', appliedFilters.search);
    if (appliedFilters.role_id) queryParams.append('role_id', appliedFilters.role_id);
    if (appliedFilters.recruiter_id) queryParams.append('recruiter_id', appliedFilters.recruiter_id);
    if (appliedFilters.client_id) queryParams.append('client_id', appliedFilters.client_id);
    if (appliedFilters.stage_id) queryParams.append('stage_id', appliedFilters.stage_id);
    if (appliedFilters.experience) queryParams.append('experience', appliedFilters.experience);
    queryParams.append('sortBy', sortBy);
    queryParams.append('page', page);

    apiFetch(`/candidates?${queryParams.toString()}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.candidates) {
          setData(resData.candidates);
          setTotal(resData.total || 0);
          setTotalPages(resData.totalPages || 1);
          setCurrentPage(resData.page || 1);
        } else {
          setData(resData);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCandidates(currentPage);
  }, [appliedFilters, sortBy, currentPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setPendingFilters(prev => ({ ...prev, [name]: value }));
    setAppliedFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const empty = { search: "", role_id: "", recruiter_id: "", client_id: "", stage_id: "", experience: "" };
    setPendingFilters(empty);
    setAppliedFilters(empty);
    setSortBy("newest");
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setAppliedFilters(pendingFilters);
    setCurrentPage(1);
  };

  const handleStatusChange = async (candidateId, newStageId) => {
    try {
      const res = await apiFetch(`/candidates/${candidateId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ funnel_stage_id: newStageId })
      });
      if (res.ok) {
        setData(prevData => prevData.map(c =>
          c.id === candidateId ? { ...c, funnel_stage_id: newStageId, status: masterData.funnel_stages.find(s => s.id == newStageId)?.name || c.status } : c
        ));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm(t("Are you sure you want to delete this candidate? This action cannot be undone."))) return;

    try {
      const res = await apiFetch(`/candidates/${candidateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setData(prevData => prevData.filter(c => c.id !== candidateId));
      } else {
        const errData = await res.json();
        alert(errData.message || t("Failed to delete candidate"));
      }
    } catch (err) {
      console.error("Delete Error:", err);
      alert(t("Failed to delete candidate"));
    }
  };

  const exportExcel = () => {
    const exportData = data.map(c => ({
      ID: c.id,
      NAME: c.name,
      EMAIL: c.email || 'N/A',
      PHONE: c.phone || 'N/A',
      LOCATION: c.location || 'N/A',
      "REL EXP (YEARS)": `${c.experience || 0}`,
      "JOB ROLE": c.role || 'N/A',
      "OFFICE MODE": c.office_mode || 'N/A',
      CLIENT: c.client || 'N/A',
      "RECRUITMENT FUNNEL": c.status || 'N/A',
"TYPE OF CONTRACT": c.contract_type || getContractType(c) || 'N/A',
      "OFFER STATUS": c.offer_status || 'Pending',
      "CURRENT CTC": c.current_ctc || 'N/A',
      "EXPECTED CTC": c.expected_ctc || 'N/A',
      RECRUITER: c.recruiter || 'N/A',
      "ADDED ON": new Date(c.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `Candidates_Export_${new Date().toLocaleDateString()}.xlsx`);
  };

  const getStatusColor = (statusName) => {
    if (!statusName) return "bg-gray-100 text-gray-600";
    const lower = statusName.toLowerCase();
    if (lower.includes('hired') || lower.includes('selected')) return "bg-green-100 text-green-700";
    if (lower.includes('reject')) return "bg-red-100 text-red-700";
    if (lower.includes('interview')) return "bg-blue-100 text-blue-700";
    if (lower.includes('offer')) return "bg-purple-100 text-purple-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getClientStatusColor = (statusName) => {
    if (statusName === 'Approved') return "bg-green-100 text-green-700 border-green-200";
    if (statusName === 'Rejected') return "bg-red-100 text-red-700 border-red-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const displayContractType = (candidate) => {
    // Try to display contract_type first, fallback to looking it up by contract_type_id
    if (candidate.contract_type) return candidate.contract_type;
    if (candidate.contract_type_id) {
      const found = masterData.contract_types?.find(ct => ct.id === candidate.contract_type_id);
      return found ? found.name : "-";
    }
    return "-";
  };


  // 🔄 ABBREVIATION MAPPINGS - Maps common abbreviations to database values
  const ABBREVIATION_MAPPINGS = {
    office_mode: {
      'WFO': 'On-site',
      'WFH': 'Remote',
      'WFM': 'Hybrid',
      'ONSITE': 'On-site'
    },
    client: {
      'INFOSYS': 'Infosys',
      'HCL': 'HCL',
      'TCS': 'TCS',
      'WIPRO': 'Wipro'
    }
  };

  // 🌐 REFERENCE DATA CREATION - Create missing reference data in database
  const createReferenceData = async (type, name) => {
    try {
      const endpoint = {
        'job_role': '/reference/job-roles',
        'office_mode': '/reference/office-modes',
        'client': '/reference/clients',
        'contract_type': '/reference/contract-types'
      }[type];

      if (!endpoint) {
        console.warn(`No endpoint found for type: ${type}`);
        return null;
      }

      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name: name })
      });

      if (response && response.id) {
        console.log(`✨ Created new ${type}: "${name}" with ID ${response.id}`);
        return response.id;
      }
      return null;
    } catch (error) {
      console.error(`Failed to create ${type} "${name}":`, error);
      return null;
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        // Debug: Log the first row to see all column names
        if (rawData.length > 0) {
          console.log("Excel columns found:", Object.keys(rawData[0]));
          console.log("First row data:", rawData[0]);
          console.log("Master data contract types available:", masterData.contract_types);
        }
        
        const findIdByName = async (array, name, type) => {
          if (!name) return null;
          const trimmedName = String(name).toLowerCase().trim();
          
          // Skip N/A values
          if (trimmedName === 'n/a' || trimmedName === '-') return null;
          
          // Normalize function: handle spacing and hyphenation differences
          const normalize = (str) => {
            return str
              .toLowerCase()
              .trim()
              .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
              .replace(/[\s\-]+/g, '-')  // Replace spaces and hyphens with single hyphen
              .replace(/-+/g, '-');  // Remove double hyphens
          };
          
          const normalizedSearch = normalize(trimmedName);
          
          // Try exact match first
          const found = array.find(item => 
            item.name && item.name.toLowerCase().trim() === trimmedName
          );
          
          if (found) {
            console.log(`✓ Matched "${name}" to ID ${found.id}`);
            return found.id;
          }
          
          // Try normalized match (handles "Full time" vs "Full-Time", etc.)
          const normalizedMatch = array.find(item =>
            item.name && normalize(item.name) === normalizedSearch
          );
          
          if (normalizedMatch) {
            console.log(`✓ Matched "${name}" to ID ${normalizedMatch.id}`);
            return normalizedMatch.id;
          }
          
          // Try case-insensitive match
          const caseInsensitiveMatch = array.find(item =>
            item.name && item.name.toLowerCase().trim() === trimmedName
          );
          
          if (caseInsensitiveMatch) {
            console.log(`✓ Matched "${name}" to ID ${caseInsensitiveMatch.id}`);
            return caseInsensitiveMatch.id;
          }
          
          // Try partial match as fallback
          const partialMatch = array.find(item =>
            item.name && (trimmedName.includes(item.name.toLowerCase().trim()) || 
                         item.name.toLowerCase().trim().includes(trimmedName))
          );
          
          if (partialMatch) {
            console.log(`✓ Partial matched "${name}" to ID ${partialMatch.id}`);
            return partialMatch.id;
          }

          // Try abbreviation mapping before giving up
          if (type && ABBREVIATION_MAPPINGS[type]) {
            const mappedName = ABBREVIATION_MAPPINGS[type][trimmedName.toUpperCase()];
            if (mappedName) {
              console.log(`📍 Using abbreviation mapping: "${name}" → "${mappedName}"`);
              // Recursively try to find the mapped name
              return findIdByName(array, mappedName, type);
            }
          }

          // 🆕 CREATE NEW REFERENCE DATA IF NOT FOUND
          if (type) {
            console.log(`📝 No match found for "${name}", attempting to create new ${type}...`);
            const newId = await createReferenceData(type, name);
            if (newId) {
              // Add new item to array so subsequent uses find it
              array.push({ id: newId, name: name });
              return newId;
            }
          }
          
          console.warn(`✗ Could not match or create "${name}" for type ${type}`, array.map(a => a.name));
          return null;
        };

        // Helper to get column value with multiple possible column names
        const getColumnValue = (row, ...columnNames) => {
          for (const colName of columnNames) {
            if (row[colName] !== undefined && row[colName] !== null && row[colName] !== '') {
              return row[colName];
            }
          }
          return null;
        };

        // Process candidates with async/await to handle new reference data creation
        const parsedCandidates = await Promise.all(rawData.map(async (row, idx) => {
          const contractTypeValue = getColumnValue(row, 'Contract Type', 'TYPE OF CONTRACT', 'ContractType', 'CONTRACTTYPE', 'CONTRACT TYPE');
          const contractTypeId = await findIdByName(masterData.contract_types, contractTypeValue, 'contract_type');
          
          const jobRoleValue = getColumnValue(row, 'JOB ROLE', 'Job Role');
          const jobRoleId = await findIdByName(masterData.job_roles, jobRoleValue, 'job_role');
          
          const clientValue = getColumnValue(row, 'CLIENT', 'Client');
          const clientId = await findIdByName(masterData.clients, clientValue, 'client');
          
          const officeModeValue = getColumnValue(row, 'OFFICE MODE', 'Office Mode');
          const officeModeId = await findIdByName(masterData.office_modes, officeModeValue, 'office_mode');
          
          const funnelStageValue = String(getColumnValue(row, 'RECRUITMENT FUNNEL', 'Funnel Stage') || '').split('-')[1]?.trim() || getColumnValue(row, 'RECRUITMENT FUNNEL', 'Funnel Stage');
          const funnelStageId = await findIdByName(masterData.funnel_stages, funnelStageValue);
          
          const parsedRow = {
            name: getColumnValue(row, 'NAME', 'Name') || "",
            email: getColumnValue(row, 'EMAIL', 'Email') || "",
            phone: getColumnValue(row, 'PHONE', 'Phone') || "",
            location: getColumnValue(row, 'CURRENT LOCATION', 'Location') || "",
            experience: parseInt(getColumnValue(row, 'REL EXP (YEARS)', 'Experience')) || 0,
            job_role_id: jobRoleId || masterData.job_roles[0]?.id || null,
            client_id: clientId || masterData.clients[0]?.id || null,
            funnel_stage_id: funnelStageId || masterData.funnel_stages[0]?.id || null,
            office_mode_id: officeModeId || masterData.office_modes[0]?.id || null,
            contract_type_id: contractTypeId,
            offer_status: getColumnValue(row, 'OFFER STATUS', 'Offer Status') || 'Pending',
            job_location: getColumnValue(row, 'JOB LOCATION', 'Job Location') || "",
            submission_date: getColumnValue(row, 'SUBMISSION DATE', 'Submission Date') || "",
            current_ctc: getColumnValue(row, 'CURRENT CTC', 'Current CTC') || "",
            expected_ctc: getColumnValue(row, 'EXPECTED CTC', 'Expected CTC') || "",
            recruiter_id: masterData.recruiters[0]?.id || null
          };
          
          if (contractTypeValue) {
            console.log(`Row ${idx + 1} (${row.Name || row.name}): Contract Type = "${contractTypeValue}" → ID = ${contractTypeId}`);
          }
          
          return parsedRow;
        })).then(candidates => candidates.filter(c => c.name));

        console.log("Final parsed candidates for import:", JSON.stringify(parsedCandidates, null, 2));

        const res = await apiFetch("/candidates/bulk", {
          method: "POST",
          body: JSON.stringify(parsedCandidates)
        });
        
        if (res.ok) {
          const result = await res.json();
          alert(t("Success! ") + result.message);
          fetchCandidates();
        } else {
          const errorData = await res.json();
          console.error("Server error:", errorData);
          alert(t("Error: ") + (errorData.message || "Import failed. Check console for details."));
        }
      } catch (error) {
        console.error("Import error:", error);
        alert(t("Failed to import Excel file: ") + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Candidates</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage and track your entire talent pool</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {user?.role !== 'client' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white border border-gray-200/80 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 shadow-sm"
            >
              <input type="file" ref={fileInputRef} hidden onChange={handleImport} accept="*/*" />
              Import
            </button>
          )}

          <div className="bg-gray-100 p-1 flex rounded-xl border border-gray-200">
            <button onClick={() => setViewMode("table")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === "table" ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}>List View</button>
            <button onClick={() => setViewMode("kanban")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === "kanban" ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}>Kanban</button>
          </div>

          {user?.role !== 'client' && (
            <>
              <button onClick={exportExcel} className="flex items-center gap-2 bg-white border border-gray-200/80 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 shadow-sm">{t("Export")}</button>
              <Link to="/add" className="flex items-center gap-2 bg-teal-600 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md">{t("Add Candidate")}</Link>
            </>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 p-5 rounded-2xl shadow-sm border border-yellow-200 mb-6">
        <div className="flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V18l-3-3v-4a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <h2 className="text-lg font-semibold text-yellow-700">{t("Filter Candidates")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <select name="role_id" className="w-full border border-gray-200 bg-white px-4 py-2.5 rounded-xl text-sm" value={pendingFilters.role_id} onChange={handleFilterChange}>
            <option value="">{t("All Roles")}</option>
            {masterData.job_roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select name="recruiter_id" className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl text-sm" value={pendingFilters.recruiter_id} onChange={handleFilterChange}>
            <option value="">All Recruiters</option>
            {masterData.recruiters?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          {user?.role !== 'client' && (
            <select name="client_id" className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl text-sm" value={pendingFilters.client_id} onChange={handleFilterChange}>
              <option value="">{t("All Clients")}</option>
              {masterData.clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <select name="stage_id" className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl text-sm" value={pendingFilters.stage_id} onChange={handleFilterChange}>
            <option value="">{t("All Pipeline Stages")}</option>
            {masterData.funnel_stages?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select name="experience" className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl text-sm" value={pendingFilters.experience} onChange={handleFilterChange}>
            <option value="">{t("Any Experience")}</option>
            <option value="1">1+ years</option>
            <option value="3">3+ years</option>
            <option value="5">5+ years</option>
          </select>

          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input name="search" placeholder={t("Search by name...")} className="w-full border border-gray-200 bg-white pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 text-sm" value={pendingFilters.search} onChange={handleFilterChange} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="space-x-2">
            <button onClick={handleResetFilters} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">{t("Reset")}</button>
            <button onClick={applyFilters} className="text-sm bg-yellow-600 text-white px-4 py-2 rounded-xl hover:bg-yellow-700">{t("Apply")}</button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{t("Sort By")}</span>
            <select onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} value={sortBy} className="border border-gray-200 bg-white px-4 py-2.5 rounded-xl text-sm">
              <option value="newest">{t("Recently Added")}</option>
              <option value="oldest">{t("Oldest First")}</option>
              <option value="name_asc">{t("Name A–Z")}</option>
              <option value="name_desc">{t("Name Z–A")}</option>
              <option value="exp_high">{t("Experience High→Low")}</option>
              <option value="exp_low">{t("Experience Low→High")}</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <KanbanBoard data={data} masterData={masterData} handleStatusChange={handleStatusChange} onCandidateClick={setViewCandidate} />
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-max">
              <thead className="bg-slate-50 border-b border-gray-100 sticky top-0 z-10">
                <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Candidate Info</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Client & Location</th>
                  <th className="px-6 py-4 hidden lg:table-cell">CTC Details</th>
                  <th className="px-6 py-4">Resume</th>
                  <th className="px-6 py-4">{t("RECRUITMENT FUNNEL")}</th>
                  {user?.role === 'admin' && <th className="px-6 py-4 text-center hidden lg:table-cell">Actions</th>}
                  <th className="px-6 py-4 hidden lg:table-cell">Recruiter</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Experience</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Primary Skills</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Secondary Skills</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Client Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {loading ? (
                  // Skeleton Loading Rows
                  [...Array(5)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-32 mb-2"></div><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-24 mb-2"></div><div className="h-3 bg-gray-100 rounded w-16"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-6 py-5"><div className="h-6 bg-gray-200 rounded w-14"></div></td>
                      <td className="px-6 py-5"><div className="h-6 bg-gray-200 rounded w-24"></div></td>
                      {user?.role === 'admin' && <td className="px-6 py-5"><div className="h-8 bg-gray-200 rounded w-16"></div></td>}
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="px-6 py-5"><div className="h-6 bg-gray-200 rounded w-16"></div></td>
                    </tr>
                  ))
                ) : data.length > 0 ? (
                  data.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setViewCandidate(c)}>
                      <td className="px-6 py-5">
                        <div className="font-bold text-gray-800 text-sm">{c.name}</div>
                        <div className="font-semibold text-teal-600 text-[11px] mt-1 tracking-wide uppercase">{c.role}</div>
                        {c.location && (
                          <div className="text-[11px] font-medium text-gray-400 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {c.location}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <div className="font-medium text-gray-800">{c.client || "-"}</div>
                        <div className="text-[11px] font-medium text-gray-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {c.job_location || "Remote"}
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Curr: <span className="text-gray-700 font-bold">{c.current_ctc || "-"}</span></div>
                        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-1">Exp: <span className="text-teal-600 font-bold">{c.expected_ctc || "-"}</span></div>
                      </td>
                      <td className="px-6 py-5">
                        {c.resume_url ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setResumeViewerUrl(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/${c.resume_url}`); }}
                            className="text-teal-600 font-bold hover:underline text-xs bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 transition-colors hover:bg-teal-100 inline-flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[11px] font-medium italic">Not Provided</span>
                        )}
                      </td>
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <select className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusColor(c.status)}`} value={c.funnel_stage_id || ""} onChange={(e) => handleStatusChange(c.id, e.target.value)}>
                          {masterData.funnel_stages?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-5 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Link to={`/edit/${c.id}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors ml-2" title="Edit Candidate">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </Link>
                            <button onClick={() => handleDeleteCandidate(c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Delete Candidate">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-5 hidden lg:table-cell">
                        {c.recruiter}
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        {c.experience ? `${c.experience} Years` : "-"}
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        {c.primary_skills || "-"}
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        {c.secondary_skills || "-"}
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <div className={`px-2.5 py-1 rounded text-[10px] font-bold inline-block border uppercase tracking-wider ${getClientStatusColor(c.client_status)}`}>
                          {c.client_status || 'Pending'}
                        </div>
                        {c.client_feedback && (
                          <div className="text-[11px] text-gray-500 mt-1.5 max-w-[140px] truncate" title={c.client_feedback}>
                            {c.client_feedback}
                          </div>
                        )}
                        {user?.role === 'client' && (
                          <button onClick={(e) => { e.stopPropagation(); setClientFeedbackModal(c); setClientStatus(c.client_status || 'Pending'); setClientFeedback(c.client_feedback || ''); }} className="mt-2 text-[10px] text-blue-500 font-bold hover:underline flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Provide Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  // Enhanced Empty State
                  <tr>
                    <td colSpan="11" className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 mb-1">No candidates found</h3>
                        <p className="text-gray-400 text-sm max-w-sm mb-4">Try adjusting your search filters or add a new candidate to get started.</p>
                        {user?.role !== 'client' && (
                          <Link to="/add" className="inline-flex items-center gap-2 bg-teal-600 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:bg-teal-700 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            Add Candidate
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
          <div className="text-sm text-gray-500">
            Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages > 0 ? totalPages : 1}</span>
            {total > 0 && (<span> (<span className="font-medium">{total}</span> total candidates)</span>)}
          </div>
          {totalPages > 1 && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                    fetchCandidates(currentPage - 1);
                  }
                }}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        fetchCandidates(pageNum);
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                        currentPage === pageNum
                          ? "bg-teal-600 text-white"
                          : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return (
                    <span key={pageNum} className="px-2 py-1.5 text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              <button
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1);
                    fetchCandidates(currentPage + 1);
                  }
                }}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* CLIENT FEEDBACK MODAL */}
      {clientFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-0 md:p-4">
          <div className="bg-white w-full max-w-[500px] p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Candidate Feedback</h2>
              <button onClick={() => setClientFeedbackModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status</label>
                <div className="flex gap-3">
                  {['Pending', 'Approved', 'Rejected'].map(status => (
                    <button
                      key={status}
                      onClick={() => setClientStatus(status)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${clientStatus === status
                        ? (status === 'Approved' ? 'bg-green-100 border-green-500 text-green-700' : status === 'Rejected' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-yellow-100 border-yellow-500 text-yellow-700')
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Your Feedback / Comments</label>
                <textarea
                  className="w-full border border-gray-200 p-4 rounded-xl h-32 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium resize-none bg-gray-50/50"
                  placeholder="Enter your detailed feedback here..."
                  value={clientFeedback}
                  onChange={(e) => setClientFeedback(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setClientFeedbackModal(null)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiFetch(`/candidates/${clientFeedbackModal.id}/client-feedback`, {
                        method: "PUT",
                        body: JSON.stringify({ client_status: clientStatus, client_feedback: clientFeedback })
                      });
                      if (res.ok) {
                        setClientFeedbackModal(null);
                        fetchCandidates();
                      } else {
                        alert("Failed to submit feedback.");
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="px-8 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESUME VIEWER MODAL */}
      {resumeViewerUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-0 md:p-4">
          <div className="bg-white w-full max-w-[1000px] h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Document Viewer
              </h2>
              <div className="flex gap-2">
                <a
                  href={resumeViewerUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </a>
                <button
                  onClick={() => setResumeViewerUrl(null)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 p-2 md:p-4">
              {resumeViewerUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={resumeViewerUrl}
                  className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-200"
                  title="Resume Viewer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-inner border border-gray-200 p-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Document Requires Download</h3>
                  <p className="text-gray-500 max-w-sm mb-6 text-sm">This file type cannot be previewed natively in the browser. Please download it to view.</p>
                  <a href={resumeViewerUrl} download target="_blank" rel="noreferrer" className="bg-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200/50">
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATE INFO MODAL */}
      {viewCandidate && (
        <CandidateModal
          candidate={viewCandidate}
          onClose={() => setViewCandidate(null)}
        />
      )}
    </Layout>
  );
}