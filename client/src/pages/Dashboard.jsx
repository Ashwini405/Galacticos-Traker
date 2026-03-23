import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiFetch } from "../services/api";
import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const isAnalyticsPage = location.pathname === '/analytics';
  const [stats, setStats] = useState({
    total_candidates: 0,
    open_positions: 0,
    funnel_stats: [],
    recent_candidates: [],
    placements_per_client: [],
    candidates_per_role: []
  });
  const [adminStats, setAdminStats] = useState({
    avg_time_to_hire: 0,
    best_recruiters: [],
    funnel_counts: [],
    rejection_analytics: []
  });
  const [loading, setLoading] = useState(true);

  // Client Modal State
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [submittingClient, setSubmittingClient] = useState(false);

  // User Management State
  const [systemUsers, setSystemUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Dashboard filter states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [masterData, setMasterData] = useState({ job_roles: [], funnel_stages: [], clients: [] });

  useEffect(() => {
    // Fetch master data for dropdowns
    apiFetch("/master-data")
      .then(res => res.json())
      .then(data => {
        setMasterData(data);
      })
      .catch(console.error);

    // Fetch dashboard stats
    apiFetch("/dashboard/stats")
      .then(res => res.json())
      .then(data => {
        setStats(data);
        if (!isAdmin) setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load dashboard stats", err);
        if (!isAdmin) setLoading(false);
      });

    // Fetch Admin analytics if user is admin
    if (isAdmin) {
      apiFetch("/admin/analytics")
        .then(res => res.json())
        .then(data => {
          setAdminStats(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load admin stats", err);
          setLoading(false);
        });

      apiFetch("/admin/users")
        .then(res => res.json())
        .then(data => setSystemUsers(data))
        .catch(console.error);
    }
  }, []);

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const res = await apiFetch(`/admin/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setEditingUser(null);
        const newUsers = await apiFetch("/admin/users").then(r => r.json());
        setSystemUsers(newUsers);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to update user");
      }
    } catch (err) {
      alert("Error updating user");
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setSystemUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const err = await res.json();
        alert(err.message || "Failed to delete user");
      }
    } catch (err) {
      alert("Error deleting user");
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setSubmittingClient(true);
    try {
      const res = await apiFetch("/clients", {
        method: "POST",
        body: JSON.stringify({ name: newClientName })
      });
      if (res.ok) {
        setClientModalOpen(false);
        setNewClientName("");
        // Reload dashboard stats and master data
        const newStats = await apiFetch("/dashboard/stats").then(res => res.json());
        setStats(newStats);
        const newMasterData = await apiFetch("/master-data").then(res => res.json());
        setMasterData(newMasterData);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to add client");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding client");
    } finally {
      setSubmittingClient(false);
    }
  };

  // Format data for charts
  const barChartData = (stats.candidates_per_role || []).map(item => ({
    role: item.role,
    count: item.count
  }));

  // Define a distinct, premium color palette for the Funnel Pie Chart
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#F43F5E'];
  const pieChartData = (stats.funnel_stats || []).map((item, index) => ({
    name: item.stage,
    value: item.count,
    color: COLORS[index % COLORS.length]
  })).filter(d => d.value > 0);

  // Derive filtered stats dynamically
  const filteredCandidates = (stats.recent_candidates || []).filter(c => {
    const matchesSearch = search === "" || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "" || c.role === roleFilter;

    // Status filter logic (since c.status is a string like "Screening", "Interview", etc)
    const matchesStatus = statusFilter === "" || (c.status && c.status.toLowerCase().includes(statusFilter.toLowerCase()));

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStageCount = (stageNameMatch) => {
    // We derive these directly from the filtered Candidates list now if filters are active, 
    // otherwise fallback to the aggregated funnel stats for the total overview
    if (search || roleFilter || statusFilter) {
      return filteredCandidates.filter(c => c.status?.toLowerCase().includes(stageNameMatch)).length;
    }

    return (stats.funnel_stats || [])
      .filter(s => s.stage?.toLowerCase().includes(stageNameMatch))
      .reduce((sum, s) => sum + s.count, 0);
  };

  const interviewCount = getStageCount('interview');
  const selectedCount = getStageCount('hired') + getStageCount('offer');
  const rejectedCount = getStageCount('reject');

  // Update pie chart if filtered
  let currentPieData = pieChartData;
  if (search || roleFilter || statusFilter) {
    currentPieData = [
      { name: "Selected", value: selectedCount, color: COLORS[0] },
      { name: "Interview", value: interviewCount, color: COLORS[1] },
      { name: "Rejected", value: rejectedCount, color: COLORS[4] },
      { name: "Screening", value: getStageCount('screen') || getStageCount('source'), color: COLORS[2] }
    ].filter(d => d.value > 0);
  }

  // Admin Analytics Pie Chart
  const rejectionPieData = (adminStats.rejection_analytics || []).map((item, index) => ({
    name: item.rejection_reason,
    value: item.count,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <Layout>
      {/* 🚀 Header: Branding & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
            Galacticos
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium tracking-wide">Recruitment Overview</p>
        </div>

        <div className="w-full max-w-[380px] mx-auto sm:mx-0 flex flex-col sm:flex-row gap-3">
          <Link to="/candidates" className="w-full sm:flex-1 bg-white hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-semibold transition text-gray-700 border border-gray-200 shadow-sm flex items-center justify-center gap-2">
            View All Candidates
          </Link>
          <Link to="/add" className="w-full sm:flex-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-teal-200 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Candidate
          </Link>
        </div>
      </div>

      {/* 🚀 Dashboard Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            placeholder="Search recent talent..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm outline-none transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="md:w-48 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm text-gray-600 bg-white shadow-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {masterData.job_roles?.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>

        <select
          className="md:w-48 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 outline-none text-sm text-gray-600 bg-white shadow-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Stages</option>
          {masterData.funnel_stages?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>

        {(search || roleFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); }}
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium transition"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      ) : (
        <>
          {/* 🚀 KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { title: "Conversion Rate", value: `${stats.conversion_rate || 0}%`, trend: "Screening → Selected", iconColor: "text-emerald-500", bgIcon: "bg-emerald-50", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
              { title: "Stuck in Interview", value: stats.stuck_candidates || 0, trend: "> 7 days warning", iconColor: "text-rose-500", bgIcon: "bg-rose-50", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { title: isAdmin ? "Avg Time to Hire" : "Hired This Month", value: isAdmin ? `${adminStats.avg_time_to_hire} days` : (stats.hired_this_month || 0), trend: isAdmin ? "System-wide speed" : "Recent Placement Trend", iconColor: "text-blue-500", bgIcon: "bg-blue-50", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { title: "Total Talent Pool", value: stats.total_candidates, trend: "Overall Candidates", iconColor: "text-teal-500", bgIcon: "bg-teal-50", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100/60 group relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 transition-transform group-hover:scale-150 duration-500 bg-current text-gray-900 pointer-events-none"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-semibold tracking-wide uppercase">{card.title}</p>
                    <h2 className="text-4xl font-extrabold mt-3 text-gray-800 tracking-tight">
                      {card.value}
                    </h2>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bgIcon} ${card.iconColor}`}>
                    {card.icon}
                  </div>
                </div>
                <p className="text-xs mt-4 font-medium text-gray-400">{card.trend}</p>
              </div>
            ))}
          </div>

          {/* 🚀 Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100/60">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800">Candidates by Role</h3>
                <p className="text-sm text-gray-400 mt-1">Distribution across all open positions</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                    <XAxis dataKey="role" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} angle={-45} textAnchor="end" height={60} dy={10} interval={0} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px' }} />
                    <Bar dataKey="count" fill="url(#colorTeal)" radius={[8, 8, 8, 8]} barSize={36}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#14b8a6' : '#0d9488'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100/60 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800">{isAdmin && isAnalyticsPage ? "Rejection Reasons Analytics" : "Pipeline Distribution"}</h3>
                <p className="text-sm text-gray-400 mt-1">{isAdmin && isAnalyticsPage ? "Why candidates are dropping out" : "Breakdown of current funnel stages"}</p>
              </div>
              <div className="flex-1 flex items-center justify-center h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={isAdmin && isAnalyticsPage && rejectionPieData.length > 0 ? rejectionPieData : currentPieData}
                      dataKey="value"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      stroke="none"
                      cornerRadius={8}
                    >
                      {(isAdmin && isAnalyticsPage && rejectionPieData.length > 0 ? rejectionPieData : currentPieData).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 👑 Admin Specific Insights (Best Recruiter) */}
          {isAdmin && isAnalyticsPage && adminStats.best_recruiters?.length > 0 && (
            <div className="mb-8 bg-gradient-to-tr from-gray-900 to-gray-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-gray-900/10">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    <span className="text-yellow-400">🏆</span> Best Recruiter Performance
                  </h2>
                  <p className="text-gray-400 text-sm max-w-sm">Top performers based on candidates successfully hired into actual roles.</p>
                </div>
                <div className="flex bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 gap-6 flex-wrap">
                  {adminStats.best_recruiters.map((rec, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center font-bold text-lg shadow-inner">
                        {rec.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold">{rec.name}</p>
                        <p className="text-xs text-teal-400 font-medium uppercase tracking-wider">{rec.hires} Hires</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 🚀 System Users Table (Admin Only) */}
          {isAdmin && !isAnalyticsPage && (
            <div className="mb-8 bg-white p-7 rounded-3xl shadow-sm border border-gray-100/60">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">System Users</h2>
                  <p className="text-sm text-gray-400 mt-1">Manage HR and Client accounts</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-4 pt-2 font-semibold">User</th>
                      <th className="pb-4 pt-2 font-semibold hidden md:table-cell">Email</th>
                      <th className="pb-4 pt-2 font-semibold">Role</th>
                      <th className="pb-4 pt-2 font-semibold hidden md:table-cell">Client</th>
                      <th className="pb-4 pt-2 font-semibold text-right hidden md:table-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {systemUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 font-bold text-gray-700 text-sm flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center text-indigo-500 font-bold text-xs uppercase shadow-sm">
                            {u.name.charAt(0)}
                          </div>
                          {u.name}
                        </td>
                        <td className="py-4 text-gray-500 text-sm hidden md:table-cell">{u.email}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide shadow-sm
                            ${u.role === 'admin' ? "bg-red-50 text-red-700 border-red-100" : ""}
                            ${u.role === 'hr' ? "bg-blue-50 text-blue-700 border-blue-100" : ""}
                            ${u.role === 'client' ? "bg-teal-50 text-teal-700 border-teal-100" : ""}
                            border
                          `}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 text-gray-500 text-sm hidden md:table-cell">{u.client_name || '-'}</td>
                        <td className="py-4 text-right hidden md:table-cell">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingUser(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit User">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete User">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {systemUsers.length === 0 && (
                  <div className="text-center py-10 text-gray-500 text-sm">No users found.</div>
                )}
              </div>
            </div>
          )}

          {/* 🚀 Tables Section: Recent Candidates & Client Placements */}
          {!isAnalyticsPage && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Candidates Table */}
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100/60 flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Recent Candidates</h2>
                    <p className="text-sm text-gray-400 mt-1">Latest additions to the talent pool</p>
                  </div>
                  <Link to="/candidates" className="text-teal-600 text-sm font-semibold hover:text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-lg transition">View Full Pipeline →</Link>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-4 pt-2 font-semibold">Candidate Name</th>
                        <th className="pb-4 pt-2 font-semibold">Job Role</th>
                        <th className="pb-4 pt-2 font-semibold">Current Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {filteredCandidates.slice(0, 5).map((c, index) => (
                        <tr key={index} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="py-5 font-bold text-gray-700 text-sm flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs uppercase shadow-sm">
                              {c.name.charAt(0)}
                            </div>
                            {c.name}
                          </td>
                          <td className="py-5 text-gray-500 text-sm font-medium">{c.role || '-'}</td>
                          <td className="py-5">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide shadow-sm
                          ${c.status?.toLowerCase().includes('hired') || c.status?.toLowerCase().includes('offer') ? "bg-green-50 text-green-700 border-green-100" : ""}
                          ${c.status?.toLowerCase().includes('interview') ? "bg-blue-50 text-blue-700 border-blue-100" : ""}
                          ${c.status?.toLowerCase().includes('reject') ? "bg-red-50 text-red-700 border-red-100" : ""}
                          ${(!c.status || c.status?.toLowerCase().includes('screen') || c.status?.toLowerCase().includes('sourced')) ? "bg-gray-50 text-gray-700 border-gray-200" : ""}
                          border
                        `}>
                              {c.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredCandidates.length === 0 && (
                    <div className="text-center py-16 flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </div>
                      <h3 className="text-gray-800 font-bold mb-1">No candidates yet</h3>
                      <p className="text-gray-500 text-sm max-w-xs mb-4">Your talent pipeline is empty. Add your first candidate to start tracking.</p>
                      <Link to="/add" className="bg-teal-50 text-teal-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-teal-100 transition">Add Candidate</Link>
                    </div>
                  )}
                </div>
              </div> {/* <-- Closes Recent Candidates inner widget */}

              {/* Placements by Client Widget */}
              <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100/60 flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Placements by Client</h2>
                    <p className="text-sm text-gray-400 mt-1">Total hired/offered per account</p>
                  </div>
                  <button onClick={() => setClientModalOpen(true)} className="text-teal-600 text-sm font-semibold hover:text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-lg transition">+ New Client</button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  <div className="space-y-4">
                    {stats.placements_per_client && stats.placements_per_client.map((pc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 border border-gray-100/50 transition">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold border border-teal-100">
                            {pc.client.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-gray-800 font-bold text-sm">{pc.client}</h4>
                            <p className="text-gray-400 text-xs mt-0.5">Corporate Client</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-extrabold text-teal-600">{pc.count}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Placements</span>
                        </div>
                      </div>
                    ))}

                    {(!stats.placements_per_client || stats.placements_per_client.length === 0) && (
                      <div className="text-center py-10 flex flex-col items-center">
                        <h3 className="text-gray-800 font-bold mb-1">No placements yet</h3>
                        <p className="text-gray-500 text-sm">Start hiring to see metrics here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 🚀 Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 h-full flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-lg">Edit System User</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEditUserSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value, client_id: e.target.value !== 'client' ? null : editingUser.client_id })}
                >
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="client">Client</option>
                </select>
              </div>

              {editingUser.role === 'client' && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Associated Client</label>
                  <select
                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
                    value={editingUser.client_id || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, client_id: e.target.value })}
                    required={editingUser.role === 'client'}
                  >
                    <option value="">Select a Client</option>
                    {masterData.clients?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl text-gray-500 font-medium hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submittingUser} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl font-semibold transition disabled:opacity-70 shadow-sm">
                  {submittingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 Add Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 h-full flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-lg">Add New Client</h3>
              <button onClick={() => setClientModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddClient} className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Client Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Acme Corp"
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition mb-6"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                required
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setClientModalOpen(false)} className="px-4 py-2 rounded-xl text-gray-500 font-medium hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" disabled={submittingClient} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl font-semibold transition disabled:opacity-70 shadow-sm">
                  {submittingClient ? 'Adding...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}