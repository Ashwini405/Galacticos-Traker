import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { apiFetch } from "../services/api.js";

export default function Profile() {
  const { user, login } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setMessage("");
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleNameSave = async () => {
    if (!form.name.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: "Name is required" }));
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name: form.name.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        // Update local user
        const updatedUser = { ...user, name: form.name.trim() };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        login(localStorage.getItem("token"), updatedUser);
        setFieldErrors({ name: "", currentPassword: "", newPassword: "", confirmPassword: "" });
        setMessage("Profile updated successfully!");
        setEditingName(false);
      } else {
        setError(data.message || "Update failed");
        if (data.field) {
          setFieldErrors((prev) => ({ ...prev, [data.field]: data.message }));
        }
      }
    } catch (err) {
      setError(err?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match" }));
      return;
    }
    if (form.newPassword.length < 6) {
      setFieldErrors((prev) => ({ ...prev, newPassword: "Password must be at least 6 characters" }));
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch("/api/profile/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        setFieldErrors({ name: "", currentPassword: "", newPassword: "", confirmPassword: "" });
        setForm({ ...form, currentPassword: "", newPassword: "", confirmPassword: "" });
        setMessage("Password updated successfully!");
      } else {
        setError(data.message || "Password change failed");
        if (data.field) {
          setFieldErrors((prev) => ({ ...prev, [data.field]: data.message }));
        }
      }
    } catch (err) {
      setError(err?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-[80vh] text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 to-teal-50 py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl sm:text-3xl font-bold text-white shadow-2xl">
            {user.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || 'U'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
            Profile Settings
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-md mx-auto">
            Update your personal information and security settings.
          </p>
        </div>

        {/* Profile Form */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
          
          {/* Name Section */}
          <div className="border-b border-slate-100 pb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Display Name
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="flex-1 min-w-0 bg-slate-50/50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-base sm:text-lg font-semibold text-slate-900 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white outline-none transition-all"
                placeholder="Enter your full name"
              />
              <button
                onClick={editingName ? handleNameSave : () => setEditingName(true)}
                disabled={loading}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-wide transition-all shadow-sm ${
                  editingName
                    ? "bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/30 hover:shadow-teal-500/50"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                } disabled:opacity-70`}
              >
                {editingName ? (
                  loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save"
                  )
                ) : (
                  "Edit"
                )}
              </button>
            </div>
            {fieldErrors.name && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.name}</p>
            )}
            {editingName && (
              <p className="mt-2 text-sm text-slate-500">Changes save automatically when you click Save.</p>
            )}
          </div>

          {/* Email Section (Read-only) */}
          <div className="border-b border-slate-100 pb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.27 4.84A2 2 0 0012 11a2 2 0 002-2V7l6-3.18V17l-9 4.73" />
              </svg>
              Email Address
            </h3>
            <div className="bg-slate-50/50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-sm">
                  @
                </div>
                <div>
                  <p className="font-mono text-lg text-slate-900 font-semibold">{form.email}</p>
                  <p className="text-sm text-slate-500 mt-1">Primary login email (cannot be changed)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Change Password
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  className="w-full border-2 border-slate-100 bg-slate-50/50 px-4 py-3 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-medium"
                  placeholder="Enter current password"
                />
                {fieldErrors.currentPassword && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.currentPassword}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  className="w-full border-2 border-slate-100 bg-slate-50/50 px-4 py-3 rounded-2xl focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium"
                  placeholder="Enter new password (min 6 chars)"
                />
                {fieldErrors.newPassword && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.newPassword}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full border-2 border-slate-100 bg-slate-50/50 px-4 py-3 rounded-2xl focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-medium"
                  placeholder="Confirm new password"
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-md mx-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-8 sm:py-5 rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    Update Password
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-8 p-6 rounded-2xl bg-teal-50 border-2 border-teal-200 text-teal-800 font-semibold text-center shadow-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-8 p-6 rounded-2xl bg-red-50 border-2 border-red-200 text-red-800 font-semibold text-center shadow-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

