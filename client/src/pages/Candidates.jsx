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
  const [isMobileView, setIsMobileView] = useState(false);
  const userSetViewModeRef = useRef(false);
  const fileInputRef = useRef(null);
  const [data, setData] = useState([]);  
  const [importPreviewData, setImportPreviewData] = useState(null); 
  const [isImporting, setIsImporting] = useState(false);

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

  // persisted filter values that are actually sent to the server
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    role_id: "",
    recruiter_id: "",
    client_id: "",
    stage_id: "",
    experience: ""
  });

  // temporary values shown in the inputs; user can change these and then click apply/reset
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

  useEffect(() => {
    window.scrollTo(0, 0);

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      // Default to a more mobile-friendly view, unless user has explicitly chosen a view.
      if (!userSetViewModeRef.current) {
        setViewMode(mobile ? "kanban" : "table");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    apiFetch("/master-data")
      .then(res => res.json())
      .then(resData => setMasterData(resData))
      .catch(err => console.error(err));

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchCandidates = (page = 1) => {
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
          setTotalPages(Number(resData.totalPages) || 1);
          // Removed setCurrentPage from response to prevent out-of-order race conditions
        } else {
          setData(resData);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchCandidates(currentPage);
  }, [appliedFilters, sortBy, currentPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setPendingFilters(prev => ({ ...prev, [name]: value }));
    // immediately apply so user doesn't have to click
    setAppliedFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const empty = {
      search: "",
      role_id: "",
      recruiter_id: "",
      client_id: "",
      stage_id: "",
      experience: ""
    };
    setPendingFilters(empty);
    setAppliedFilters(empty);
    setSortBy("newest");
    setCurrentPage(1);
  };

  const applyFilters = () => {
    // for manual trigger; page reset ensures results refetch
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

  const exportExcel = async () => {
    console.log("Starting export for all candidates...");
    
    let allData = [];
    
    const queryParams = new URLSearchParams();
    if (appliedFilters.search) queryParams.append('search', appliedFilters.search);
    if (appliedFilters.role_id) queryParams.append('role_id', appliedFilters.role_id);
    if (appliedFilters.recruiter_id) queryParams.append('recruiter_id', appliedFilters.recruiter_id);
    if (appliedFilters.client_id) queryParams.append('client_id', appliedFilters.client_id);
    if (appliedFilters.stage_id) queryParams.append('stage_id', appliedFilters.stage_id);
    if (appliedFilters.experience) queryParams.append('experience', appliedFilters.experience);
    
    queryParams.append('sortBy', sortBy);
    queryParams.append('limit', 'all');
    
    try {
      const res = await apiFetch(`/candidates?${queryParams.toString()}`);
      const resData = await res.json();
      if (resData.candidates) {
        allData = resData.candidates;
      }
    } catch (err) {
      console.error(`Error fetching candidates for export:`, err);
      alert("Failed to export candidates. Please try again.");
      return;
    }
    
    console.log("All data for export:", allData);
    
    // Fix for MySQL zero dates ('0000-00-00') causing Invalid Date in UI
    const formatSubmissionDate = (dateStr) => {
      if (!dateStr || dateStr === '0000-00-00' || dateStr === '' || dateStr === null || dateStr === undefined) {
        return 'Not Submitted';
      }
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    };
    
    // Helper to get contract type name from the data
    const getContractType = (candidate) => {
      if (candidate.contract_type) return candidate.contract_type;
      if (candidate.contract_type_id) {
        const found = masterData.contract_types.find(ct => ct.id === candidate.contract_type_id);
        return found ? found.name : 'N/A';
      }
      return 'N/A';
    };

    const exportData = allData.map(c => ({
      ID: c.id,
      Name: c.name,
      Email: c.email || 'N/A',
      Phone: c.phone || 'N/A',
      Location: c.location || 'N/A',
      Experience: `${c.experience || 0} Yrs`,
      "Job Role": c.role || 'N/A',
      "Office Mode": c.office_mode || 'N/A',
      Client: c.client || 'N/A',
      "Funnel Stage": c.status || 'N/A',
      "Contract Type": getContractType(c) || c.contract_type || 'N/A',
      "Offer Status": c.offer_status || 'Pending',
      "Current CTC": c.current_ctc || 'N/A',
      "Expected CTC": c.expected_ctc || 'N/A',
      Recruiter: c.recruiter || 'N/A',
      "Submission Date": formatSubmissionDate(c.submission_date),
      "Added On": new Date(c.created_at).toLocaleDateString()
    }));


    console.log("Export data with contract types:", exportData);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `Candidates_Export_${new Date().toLocaleDateString()}.xlsx`);
  };

  const confirmImport = async () => {
    if (!importPreviewData) return;
    const validCandidates = importPreviewData.filter(c => c.isValid);
    if (validCandidates.length === 0) {
      alert("No valid candidates to import!");
      return;
    }
    
    setIsImporting(true);
    try {
      // Create clean payload for the backend (removing UI-only fields)
      const payload = validCandidates.map(({ isValid, validationErrors, originalRowIndex, ...rest }) => rest);
      
      const res = await apiFetch("/candidates/bulk", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const result = await res.json();
        alert(t("Success! ") + result.message);
        setImportPreviewData(null);
        fetchCandidates();
      } else {
        const errorData = await res.json();
        alert(t("Error: ") + (errorData.message || "Import failed. Check console."));
      }
    } catch (err) {
      console.error("Bulk Import error:", err);
      alert("Bulk Import error: " + err.message);
    } finally {
      setIsImporting(false);
    }
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
        'contract_type': '/reference/contract-types',
        'recruiter': '/reference/recruiters'
      }[type];

      if (!endpoint) {
        console.warn(`No endpoint found for type: ${type}`);
        return null;
      }

      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name: name })
      });

      if (response && response.ok) {
        const data = await response.json();
        if (data && data.id) {
          console.log(`✨ Created new ${type}: "${name}" with ID ${data.id}`);
          return data.id;
        }
      }
      return null;
    } catch (error) {
      console.error(`Failed to create ${type} "${name}":`, error);
      return null;
    }
  };

  // Client-side validation synced with server/utils/validation.js
  const LOCATION_KEYWORDS = [
    'hyderabad', 'bangalore', 'bengaluru', 'delhi', 'mumbai', 'pune', 'chennai',
    'kolkata', 'ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore',
    'thane', 'bhopal', 'visakhapatnam', 'pimpri-chinchwad', 'patna', 'vadodara',
    'ghaziabad', 'ludhiana', 'coimbatore', 'kochi', 'srinagar', 'aurangabad',
    'dhanbad', 'amritsar', 'navi-mumbai', 'allahabad', 'ranchi', 'howrah',
    'guwahati', 'chandigarh', 'jabalpur', 'faridabad', 'meerut', 'varanasi',
    'bareilly', 'gorakhpur', 'belgaum', 'mysore', 'tiruppur', 'gurgaon',
    'noida', 'greater-noida', 'remote', 'wfh', 'wfo', 'onsite', 'hybrid',
    'bangcok', 'bangkok'
  ];

  const EXPECTED_COLUMNS = {
    name: { nameStr: 'Name', required: true, aliases: ['name', 'candidate name', 'full name', 'candidate'] },
    email: { nameStr: 'Email', required: false, aliases: ['email', 'e-mail', 'e mail'] },
    phone: { nameStr: 'Phone', required: false, aliases: ['phone', 'contact', 'mobile', 'phone number'] },
    location: { nameStr: 'Location', required: false, aliases: ['location', 'city', 'current location', 'current'] },
    experience: { nameStr: 'Experience', required: true, aliases: ['exp', 'experience', 'years of experience', 'rel exp (y', 'rel exp (yrs)', 'rel exp', 'relevant experience'] },
    job_role: { nameStr: 'Job Role', required: false, aliases: ['job role', 'role', 'position', 'job_role'] },
    office_mode: { nameStr: 'Office Mode', required: false, aliases: ['office mode', 'work mode', 'office mo', 'office mc', 'work mode'] },
    client: { nameStr: 'Client', required: false, aliases: ['client', 'company', 'client_name'] },
    funnel_stage: { nameStr: 'Funnel Stage', required: false, aliases: ['stage', 'status', 'funnel stage', 'recruitm', 'recruitment', 'funnel_stage'] },
    contract_type: { nameStr: 'Contract Type', required: false, aliases: ['contract type', 'employment type', 'type of c', 'type of contract', 'contract_type'] },
    offer_status: { nameStr: 'Offer Status', required: false, aliases: ['offer status', 'offer', 'offer sta'] },
    current_ctc: { nameStr: 'Current CTC', required: false, aliases: ['current ctc', 'ctc', 'current_ctc'] },
    expected_ctc: { nameStr: 'Expected CTC', required: false, aliases: ['expected ctc', 'ectc', 'expected', 'expected_ctc'] },
    recruiter: { nameStr: 'Recruiter', required: false, aliases: ['recruiter', 'assigned to', 'recruiter_name'] },
    job_location: { nameStr: 'Job Location', required: false, aliases: ['job location', 'work location', 'job locat'] },
    submission_date: { 
      nameStr: 'Submission Date', 
      required: false, 
      aliases: ['submission date', 'submission_date', 'submitted', 'date submitted', 'sub date', 'submitted date', 'date'] 
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
        
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rawData.length < 2) {
          alert("❌ The Excel file is empty or missing data rows.");
          return;
        }

        const headers = rawData[0] || [];
        const dataRows = rawData.slice(1);

        const validationErrors = []; 
        const columnIndices = {};

        for (const [field, config] of Object.entries(EXPECTED_COLUMNS)) {
          const index = headers.findIndex(h => {
            if (!h) return false;
            const cleanHeader = h.toString().replace(/\s+/g, ' ').trim().toUpperCase();
            return config.aliases.some(a => {
              const cleanAlias = a.toUpperCase();
              return cleanHeader === cleanAlias || cleanHeader.startsWith(cleanAlias + ' ') || cleanHeader.startsWith(cleanAlias + '(');
            });
          });
          
          if (index !== -1) {
            columnIndices[field] = index;
          } else if (config.required) {
            validationErrors.push(`Missing required column: "${config.nameStr}". Allowed headers: ${config.aliases.join(', ')}`);
          }
        }

        if (validationErrors.length > 0) {
          alert('❌ Validation Error(s):\n\n' + validationErrors.join('\n'));
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        // 3. Row-by-row data validation
        let firstBadRow = null;
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          // Skip physically empty rows
          if (row.length === 0 || row.every(cell => cell === undefined || cell === null || cell === '')) continue;
          
          const rowErrors = [];

          for (const [field, config] of Object.entries(EXPECTED_COLUMNS)) {
            const index = columnIndices[field];
            const rawVal = index !== undefined ? row[index] : undefined;
            const valStr = rawVal !== undefined && rawVal !== null ? rawVal.toString().trim() : '';

            if (config.required && valStr === '') {
              rowErrors.push(`${config.nameStr} is missing`);
              continue;
            }

            if (valStr !== '') {
              if (field === 'name') {
                // Sync with server: full location keywords + strict regex
                const nameLower = valStr.toLowerCase();
                const hasLocationKeyword = LOCATION_KEYWORDS.some(keyword => nameLower.includes(keyword));
                if (hasLocationKeyword) {
                  rowErrors.push(`Invalid name "${valStr}" (contains location keyword)`);
                } else if (!/^[a-zA-Z\s.\-']{2,50}$/.test(valStr)) {
                  rowErrors.push(`Invalid name "${valStr}" (invalid characters)`);
                }
              } else if (field === 'experience') {
                // Use parseFloat to handle strings like '10+' or '5.5 yrs' gracefully
                const parsedVal = valStr.replace(/[^0-9.]/g, ''); // Extract just the number parts
                const exp = parseFloat(parsedVal);
                if (isNaN(exp) || exp < 0 || exp > 50) {
                  rowErrors.push(`Invalid Experience ("${valStr}") - must contain a valid number`);
                }
              } else if (field === 'email') {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
                  rowErrors.push(`Invalid Email ("${valStr}")`);
                }
              } else if (field === 'phone') {
                if (!/^[\+]?[\d\s\-\(\)]{5,20}$/.test(valStr)) {
                  rowErrors.push(`Invalid Phone ("${valStr}")`);
                }
              } else if (field === 'current_ctc' || field === 'expected_ctc') {
                if (/^[a-zA-Z\s]+$/.test(valStr)) {
                   rowErrors.push(`Invalid CTC ("${valStr}")`);
                }
              }
            }
          }

          if (rowErrors.length > 0) {
            firstBadRow = i + 2; 
            validationErrors.push(`Row ${firstBadRow}: ` + rowErrors.join(', '));
            break; // Stop at the first bad row
          }
        }

        if (validationErrors.length > 0) {
          alert('❌ Validation Failed:\n\n' + validationErrors.join('\n'));
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        console.log("✅ Validation Passed! Matching Master Data...");

        const findIdByName = async (array, name, type) => {
          if (!name) return null;
          let trimmedName = String(name).toLowerCase().trim();
          let effectiveName = String(name).trim();
          if (trimmedName === 'n/a' || trimmedName === '-') return null;
          
          if (type && ABBREVIATION_MAPPINGS[type]) {
            const mappedName = ABBREVIATION_MAPPINGS[type][trimmedName.toUpperCase()];
            if (mappedName) {
              trimmedName = mappedName.toLowerCase().trim();
              effectiveName = mappedName;
            }
          }

          const normalize = (str) => {
            return str.toLowerCase().trim()
              .replace(/\s+/g, ' ')
              .replace(/[\s\-]+/g, '-')
              .replace(/-+/g, '-');
          };
          
          const normalizedSearch = normalize(trimmedName);
          
          const found = array.find(item => item.name && item.name.toLowerCase().trim() === trimmedName);
          if (found) return found.id;
          
          const normalizedMatch = array.find(item => item.name && normalize(item.name) === normalizedSearch);
          if (normalizedMatch) return normalizedMatch.id;
          
          const caseInsensitiveMatch = array.find(item => item.name && item.name.toLowerCase().trim() === trimmedName);
          if (caseInsensitiveMatch) return caseInsensitiveMatch.id;
          
          const partialMatch = array.find(item =>
            item.name && (trimmedName.includes(item.name.toLowerCase().trim()) || 
                          item.name.toLowerCase().trim().includes(trimmedName))
          );
          if (partialMatch) return partialMatch.id;

          if (type) {
            const newId = await createReferenceData(type, effectiveName);
            if (newId) {
              array.push({ id: newId, name: effectiveName });
              return newId;
            }
          }
          return null;
        };

        const parsedCandidates = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          if (row.length === 0 || row.every(cell => cell === undefined || cell === null || cell === '')) continue;
          
          const getVal = (field) => {
            const index = columnIndices[field];
            const rawVal = index !== undefined ? row[index] : undefined;
            return rawVal !== undefined && rawVal !== null ? rawVal.toString().trim() : '';
          };
          
          const contractTypeValue = getVal('contract_type');
          const contractTypeId = await findIdByName(masterData.contract_types, contractTypeValue, 'contract_type');
          
          const jobRoleValue = getVal('job_role');
          const jobRoleId = await findIdByName(masterData.job_roles, jobRoleValue, 'job_role');
          
          const clientValue = getVal('client');
          const clientId = await findIdByName(masterData.clients, clientValue, 'client');
          
          const officeModeValue = getVal('office_mode');
          const officeModeId = await findIdByName(masterData.office_modes, officeModeValue, 'office_mode');
          
          const funnelStageRaw = getVal('funnel_stage');
          const funnelStageValue = funnelStageRaw.split('-')[1]?.trim() || funnelStageRaw;
          const funnelStageId = await findIdByName(masterData.funnel_stages, funnelStageValue);
          
          const recruiterValue = getVal('recruiter');
          const recruiterId = await findIdByName(masterData.recruiters, recruiterValue, 'recruiter');

          parsedCandidates.push({
            name: getVal('name'),
            email: getVal('email'),
            phone: getVal('phone'),
            location: getVal('location'),
            experience: parseInt(getVal('experience')) || 0,
            job_role_id: jobRoleId || masterData.job_roles[0]?.id || null,
            client_id: clientId || masterData.clients[0]?.id || null,
            funnel_stage_id: funnelStageId || masterData.funnel_stages[0]?.id || null,
            office_mode_id: officeModeId || masterData.office_modes[0]?.id || null,
            contract_type_id: contractTypeId,
            offer_status: getVal('offer_status') || 'Pending',
            job_location: getVal('job_location') || "",
            submission_date: getVal('submission_date') || null,
            current_ctc: getVal('current_ctc') || "",
            expected_ctc: getVal('expected_ctc') || "",
            recruiter_id: recruiterId || null,
            isValid: true,
            validationErrors: [],
            originalRowIndex: i + 2
          });
          
          if (contractTypeValue) {
            console.log(`Row ${i + 1} (${getVal('name')}): Contract Type = "${contractTypeValue}" → ID = ${contractTypeId}`);
          }
        }

        // Show Real-time Import Validation Preview instead of automatically firing
        setImportPreviewData(parsedCandidates);

        // Show Real-time Import Validation Preview instead of automatically firing
        setImportPreviewData(parsedCandidates);

      } catch (error) {
        console.error("Import parsing error:", error);
        alert(t("Failed to parse Excel file: ") + error.message);
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
            <button
              onClick={() => {
                userSetViewModeRef.current = true;
                setViewMode("table");
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === "table" ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
            >
              List View
            </button>
            <button
              onClick={() => {
                userSetViewModeRef.current = true;
                setViewMode("kanban");
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === "kanban" ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
            >
              Kanban
            </button>
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
      ) : isMobileView ? (
        // Mobile card layout
        <div className="space-y-4">
          {data.length > 0 ? (
            data.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewCandidate(c)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{c.name}</h3>
                    <p className="text-teal-600 font-semibold text-sm uppercase tracking-wide">{c.role}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold border uppercase tracking-wider ${getStatusColor(c.status)}`}>
                    {c.status}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-600">{c.location || "Remote"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-600">{c.experience ? `${c.experience} Years` : "N/A"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-600">{c.recruiter || "N/A"}</span>
                  </div>

                  {c.resume_url && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setResumeViewerUrl(c.resume_url.startsWith('http') ? c.resume_url : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/${c.resume_url}`); }}
                      className="text-teal-600 font-bold hover:underline text-sm bg-teal-50 px-3 py-1 rounded-lg border border-teal-100 inline-flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Resume
                    </button>
                  )}
                </div>

                {user?.role === 'admin' && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/edit/${c.id}`} className="flex-1 text-center py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold">
                      Edit
                    </Link>
                    <button onClick={() => handleDeleteCandidate(c.id)} className="flex-1 text-center py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 font-semibold">No candidates found.</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-max">
              <thead className="bg-slate-50 border-b border-gray-100">
                <tr className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Candidate Info</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Client & Location</th>
                  <th className="px-6 py-4 hidden lg:table-cell">CTC Details</th>
                  <th className="px-6 py-4">Resume</th>
                  <th className="px-6 py-4">{t("RECRUITMENT FUNNEL")}</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Recruiter</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Contract Type</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Offer Status</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Experience</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Skills</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Client Feedback</th>
                  {user?.role === 'admin' && <th className="px-6 py-4 text-center hidden lg:table-cell">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {data.length > 0 ? (
                  data.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setViewCandidate(c)}>
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
                            onClick={(e) => { e.stopPropagation(); setResumeViewerUrl(c.resume_url.startsWith('http') ? c.resume_url : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/${c.resume_url}`); }}
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
                      <td className="px-6 py-5 hidden lg:table-cell">{c.recruiter}</td>
                      <td className="px-6 py-5 hidden lg:table-cell">{displayContractType(c)}</td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          c.offer_status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 
                          c.offer_status === 'Offered' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          c.offer_status === 'Joined' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                          c.offer_status === 'Dropped' ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {c.offer_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">{c.experience ? `${c.experience} Years` : "-"}</td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide"> <span className="text-gray-700 font-bold">{c.primary_skills || "-"}</span></div>
                        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-1"> <span className="text-teal-600 font-bold">{c.secondary_skills || "-"}</span></div>
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
                        {user && (
                          <button onClick={(e) => { e.stopPropagation(); setClientFeedbackModal(c); setClientStatus(c.client_status || 'Pending'); setClientFeedback(c.client_feedback || ''); }} className="mt-2 text-[10px] text-blue-500 font-bold hover:underline flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Provide Review
                          </button>
                        )}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-5 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Link to={`/edit/${c.id}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Edit Candidate">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </Link>
                            <button onClick={() => handleDeleteCandidate(c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Delete Candidate">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="11" className="px-6 py-24 text-center text-gray-400 font-semibold">No candidates found.</td></tr>
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
                    setCurrentPage(prev => prev - 1);
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
                    setCurrentPage(prev => prev + 1);
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-[500px] rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Candidate Feedback</h2>
                <button onClick={() => setClientFeedbackModal(null)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-50 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">STATUS</label>
                  <div className="flex gap-3">
                    {['Pending', 'Approved', 'Rejected'].map(status => (
                      <button
                        key={status}
                        onClick={() => setClientStatus(status)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${clientStatus === status
                          ? (status === 'Approved' ? 'bg-[#e6f7ec] border-emerald-400 text-emerald-600' : status === 'Rejected' ? 'bg-red-50 border-red-400 text-red-600' : 'bg-amber-50 border-amber-400 text-amber-600')
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">YOUR FEEDBACK / COMMENTS</label>
                  <textarea
                    className="w-full border border-slate-200 p-4 rounded-xl h-32 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium resize-none bg-white placeholder:text-slate-400 text-sm text-slate-700"
                    placeholder="Enter your detailed feedback here..."
                    value={clientFeedback}
                    onChange={(e) => setClientFeedback(e.target.value)}
                  />
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => setClientFeedbackModal(null)}
                    className="px-6 py-2.5 bg-slate-50 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition-all text-sm"
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
                    className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all text-sm"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* RESUME VIEWER MODAL */}
      {resumeViewerUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-0 md:p-4">
          <div className="bg-white w-full h-full md:max-w-[1000px] md:h-[90vh] md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
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
                <object
                  data={resumeViewerUrl}
                  type="application/pdf"
                  className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-200"
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500 mb-4">Your browser does not support inline PDFs.</p>
                    <a href={resumeViewerUrl} target="_blank" rel="noreferrer" className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold">
                      Download PDF
                    </a>
                  </div>
                </object>
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

      {/* IMPORT PREVIEW MODAL */}
      {importPreviewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Real-time Data Validation
                </h2>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  Found <span className="text-green-600 font-bold">{importPreviewData.filter(c => c.isValid).length}</span> valid candidates and <span className="text-red-500 font-bold">{importPreviewData.filter(c => !c.isValid).length}</span> issues.
                </p>
              </div>
              <button onClick={() => setImportPreviewData(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-50 p-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-full">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-4 py-3 text-center w-16">Row</th>
                      <th className="px-4 py-3 w-28">Status</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 w-full">Validation Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreviewData.map((row, i) => (
                      <tr key={i} className={`hover:bg-gray-50 transition-colors ${!row.isValid ? 'bg-red-50/20' : ''}`}>
                        <td className="px-4 py-3 text-gray-500 text-center font-medium">#{row.originalRowIndex}</td>
                        <td className="px-4 py-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 uppercase tracking-widest shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 uppercase tracking-widest shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              Error
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{row.name || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.email || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.phone || '-'}</td>
                        <td className="px-4 py-3 text-wrap max-w-[400px]">
                          {!row.isValid && row.validationErrors ? (
                            <div className="flex flex-col gap-1">
                              {row.validationErrors.map((err, errIdx) => (
                                <div key={errIdx} className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-start gap-1">
                                  <span>•</span>
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">- No Issues -</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {importPreviewData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium">
                          No data found in the file.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Rows with validation errors will be ignored. Only valid rows will securely update the database.
              </p>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setImportPreviewData(null)}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  disabled={importPreviewData.filter(c => c.isValid).length === 0 || isImporting}
                  className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-600/20"
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Importing..
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Import {importPreviewData.filter(c => c.isValid).length} Valid Row{importPreviewData.filter(c => c.isValid).length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}