import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://galacticos-traker.onrender.com";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [status, setStatus] = useState(null); // "success" | "error"
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validate = (val) => {
    if (val && !val.trim().toLowerCase().endsWith("@galacticosnetwork.com")) {
      setEmailError("Please enter a valid @galacticosnetwork.com email.");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim().toLowerCase().endsWith("@galacticosnetwork.com")) {
      setEmailError("Please enter a valid @galacticosnetwork.com email.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setStatus(res.ok ? "success" : "error");
      setMessage(data.message || (res.ok ? "Reset link sent!" : "Something went wrong."));
    } catch {
      setStatus("error");
      setMessage("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center font-bold text-2xl text-white mx-auto mb-4">
            G
          </div>
          <h2 className="text-2xl font-black text-slate-900">Forgot Password</h2>
          <p className="text-slate-500 text-sm mt-1">Enter your company email to receive a reset link.</p>
        </div>

        {status === "success" ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">{message}</p>
            <p className="text-slate-400 text-sm">Check your inbox and follow the link to reset your password.</p>
            <button onClick={() => navigate("/login")} className="text-teal-600 font-bold text-sm hover:underline">
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {status === "error" && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-center">{message}</p>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validate(e.target.value); }}
                onBlur={(e) => validate(e.target.value)}
                placeholder="name@galacticosnetwork.com"
                className={`w-full border-2 bg-slate-50/50 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:bg-white transition-all font-medium text-slate-800 ${emailError ? "border-red-400 focus:ring-red-500/5 focus:border-red-500" : "border-slate-100 focus:ring-teal-500/5 focus:border-teal-500"}`}
              />
              {emailError && <p className="mt-1.5 text-xs font-medium text-red-500">{emailError}</p>}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Send Reset Link"}
            </button>
            <p className="text-center text-sm text-slate-500">
              <button type="button" onClick={() => navigate("/login")} className="text-teal-600 font-bold hover:underline">
                Back to Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
