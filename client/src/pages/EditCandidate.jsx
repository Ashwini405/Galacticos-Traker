import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import Layout from "../components/Layout";

export default function EditCandidate() {
    const t = (key) => key;
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [masterData, setMasterData] = useState({
        job_roles: [],
        clients: [],
        funnel_stages: [],
        contract_types: [],
        office_modes: [],
        recruiters: []
    });

    const [resumeFile, setResumeFile] = useState(null);

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        location: "",
        experience: "",
        primary_skills: "",
        secondary_skills: "",
        job_role_id: "",
        client_id: "",
        office_mode_id: "",
        funnel_stage_id: "",
        contract_type_id: "",
        expected_ctc: "",
        current_ctc: "",
        job_location: "",
        submission_date: "",
        recruiter_id: ""
    });

    useEffect(() => {
        apiFetch("/master-data")
            .then(res => res.json())
            .then(data => {
                setMasterData(data);
                fetchCandidateData(data);
            })
            .catch(err => {
                console.error("Error fetching master data:", err);
                setFetching(false);
            });
    }, [id]);

    const fetchCandidateData = (md) => {
        apiFetch(`/candidates/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Candidate not found");
                return res.json();
            })
            .then(candidate => {
                setForm({
                    name: candidate.name || "",
                    email: candidate.email || "",
                    phone: candidate.phone || "",
                    location: candidate.location || "",
                    experience: candidate.experience !== null ? candidate.experience : "",
                    primary_skills: candidate.primary_skills || "",
                    secondary_skills: candidate.secondary_skills || "",
                    job_role_id: candidate.job_role_id || md.job_roles?.[0]?.id || "",
                    client_id: candidate.client_id || md.clients?.[0]?.id || "",
                    office_mode_id: candidate.office_mode_id || md.office_modes?.[0]?.id || "",
                    funnel_stage_id: candidate.funnel_stage_id || md.funnel_stages?.[0]?.id || "",
                    contract_type_id: candidate.contract_type_id || md.contract_types?.[0]?.id || "",
                    expected_ctc: candidate.expected_ctc || "",
                    current_ctc: candidate.current_ctc || "",
                    job_location: candidate.job_location || "",
                    submission_date: candidate.submission_date || "",
                    recruiter_id: candidate.recruiter_id || md.recruiters?.[0]?.id || ""
                });
                setFetching(false);
            })
            .catch(err => {
                console.error("Error fetching candidate:", err);
                alert("Failed to load candidate data.");
                navigate("/candidates");
            });
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // --- VALIDATIONS ---
        const errors = [];
        
        if (form.name && !/^[A-Za-z\s.-]+$/.test(form.name)) {
            errors.push("Candidate Name must only contain letters, spaces, dots, or hyphens.");
        }
        
        if (form.phone && !/^[\+]?[\d\s\-\(\)]{5,20}$/.test(form.phone)) {
            errors.push("Please enter a valid phone number.");
        }

        if (form.experience !== "" && form.experience !== null) {
            const exp = Number(form.experience);
            if (isNaN(exp) || exp < 0 || exp > 50) {
                errors.push("Experience must be a valid number between 0 and 50.");
            }
        }

        if (form.primary_skills && /^\d+$/.test(form.primary_skills.trim())) {
            errors.push("Primary skills must contain valid text (cannot be just numbers).");
        }
        
        if (form.secondary_skills && /^\d+$/.test(form.secondary_skills.trim())) {
            errors.push("Secondary skills must contain valid text (cannot be just numbers).");
        }
        
        if (form.expected_ctc && /^[a-zA-Z\s]+$/.test(form.expected_ctc.trim())) {
            errors.push("Expected CTC must contain numeric values (cannot be just text).");
        }
        
        if (form.current_ctc && /^[a-zA-Z\s]+$/.test(form.current_ctc.trim())) {
            errors.push("Current CTC must contain numeric values (cannot be just text).");
        }

        if (errors.length > 0) {
            alert("Validation Errors:\n\n• " + errors.join("\n• "));
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                formData.append(key, form[key] || "");
            });
            if (resumeFile) {
                formData.append("resume", resumeFile);
            }

            const response = await apiFetch(`/candidates/${id}`, {
                method: "PUT",
                body: formData,
            });

            if (response.ok) {
                navigate("/candidates");
            } else {
                const errData = await response.json();
                throw new Error(errData.message || "Failed to update candidate");
            }
        } catch (error) {
            console.error("Error:", error);
            alert(error.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full border border-gray-200/80 bg-gray-50/50 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all text-sm font-medium placeholder:text-gray-400";
    const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2";

    if (fetching) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto pb-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Edit Candidate</h1>
                    <p className="text-gray-500 mt-1 font-medium">
                        Update the details for this candidate.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/80 mb-8"
                >
                    <div className="pb-4 mb-6 border-b border-gray-100/80">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            COMPANY INFO
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className={labelClass}>NAME</label>
                            <input
                                name="name"
                                placeholder="John Doe"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.name}
                                required
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Email Address</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="john@example.com"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.email}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Phone Number</label>
                            <input
                                name="phone"
                                placeholder="+1 234 567 890"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.phone}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className={labelClass}> Update Resume (Pdf, DOCX)</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="w-full border border-gray-200/80 bg-gray-50/50 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 hover:bg-white transition-all text-sm font-medium text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                onChange={(e) => setResumeFile(e.target.files[0])}
                            />
                            <p className="text-xs text-gray-400 mt-2 ml-1">Leave blank to keep current resume.</p>
                        </div>

                        <div>
                            <label className={labelClass}>CURRENT LOCATION</label>
                            <input
                                name="location"
                                placeholder="City, Country"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.location}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>REL EXP (YEARS)</label>
                            <input
                                name="experience"
                                type="number"
                                placeholder="0"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.experience}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Primary Skills</label>
                            <input
                                name="primary_skills"
                                placeholder="e.g. JavaScript, React, Node.js"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.primary_skills}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Secondary Skills</label>
                            <input
                                name="secondary_skills"
                                placeholder="e.g. Python, SQL, AWS"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.secondary_skills}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Expected CTC</label>
                            <input
                                name="expected_ctc"
                                placeholder="e.g. 100k USD"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.expected_ctc}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Current CTC</label>
                            <input
                                name="current_ctc"
                                placeholder="e.g. 80k USD"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.current_ctc}
                            />
                        </div>
                    </div>

                    <div className="pb-4 mt-8 mb-6 border-b border-gray-100/80">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            RECRUITING INFO
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Job Location</label>
                            <input
                                name="job_location"
                                placeholder="e.g. Hyderabad"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.job_location}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Submission Date</label>
                            <input
                                name="submission_date"
                                type="date"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.submission_date}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>JOB ROLE</label>
                            <select
                                name="job_role_id"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.job_role_id}
                                required
                            >
                                {masterData.job_roles?.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>CLIENT</label>
                            <select
                                name="client_id"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.client_id}
                                required
                            >
                                {masterData.clients?.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>RECRUITMENT FUNNEL</label>
                            <select
                                name="funnel_stage_id"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.funnel_stage_id}
                                required
                            >
                                {masterData.funnel_stages?.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>OFFICE MODE</label>
                            <select
                                name="office_mode_id"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.office_mode_id}
                                required
                            >
                                {masterData.office_modes?.map(mode => (
                                    <option key={mode.id} value={mode.id}>{mode.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>TYPE OF CONTRACT</label>
                            <select
                                name="contract_type_id"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.contract_type_id}
                                required
                            >
                                {masterData.contract_types?.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Assigned Recruiter</label>
                            <select
                                name="recruiter_id"
                                className={inputClass}
                                onChange={handleChange}
                                value={form.recruiter_id}
                                required
                            >
                                {masterData.recruiters?.map(rec => (
                                    <option key={rec.id} value={rec.id}>{rec.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-gray-100/80">
                        <button
                            type="button"
                            onClick={() => navigate("/candidates")}
                            className="px-6 py-2.5 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold hover:from-teal-600 hover:to-teal-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md shadow-teal-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}

