// import { useContext, useState } from "react";
// import { AuthContext } from "../context/AuthContext";
// import { useNavigate } from "react-router-dom";

// export default function Login() {
//   const { login } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   const handleLogin = async () => {
//     setIsLoading(true);
//     try {
//       const res = await fetch(`${API_URL}/login`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, password })
//       });

//       const data = await res.json();

//       if (data.token) {
//         login(data.token, data.user);
//         navigate("/");
//       } else {
//         alert("Invalid credentials");
//       }
//     } catch (error) {
//       alert("Server error. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const testLogin = (roleEmail) => {
//     setEmail(roleEmail);
//     setPassword("password123");
//   };

//   return (
//     <div className="min-h-screen flex text-gray-800 bg-white font-sans selection:bg-teal-100 selection:text-teal-900">
//       {/* Left side: Branding / Promotional */}
//       <div className="hidden lg:flex flex-col justify-between w-[45%] p-16 bg-[#0f172a] text-white relative overflow-hidden">
//         {/* Animated Background Elements */}
//         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse"></div>
//         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
//         {/* Subtle Grid Pattern Overlay */}
//         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
//              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54 48L54 6L6 6L6 54L54 54L54 48Z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")` }}>
//         </div>

//         <div className="relative z-10 flex items-center gap-3">
//           <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center font-bold text-2xl shadow-[0_0_20px_rgba(20,184,166,0.4)] border border-white/20">
//             G
//           </div>
//           <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
//             Galacticos Tracking
//           </span>
//         </div>

//         <div className="relative z-10">
//           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-widest mb-6">
//             <span className="relative flex h-2 w-2">
//               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
//               <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
//             </span>
//             New Version 2.0
//           </div>
//           <h1 className="text-6xl font-extrabold leading-[1.1] tracking-tight mb-8">
//             Hire the <br />
//             <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-100 to-blue-400">
//               best talent
//             </span>
//             , faster.
//           </h1>
//           <p className="text-gray-400 text-xl leading-relaxed max-w-md font-light">
//             Data-driven applicant tracking for modern recruitment teams, hiring managers, and enterprise clients.
//           </p>
//         </div>

//         <div className="relative z-10 flex items-center gap-6 text-sm font-medium text-gray-500">
//           <span>© 2026 Galacticos Network</span>
//           <div className="flex gap-4">
//             <a href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</a>
//             <a href="#" className="hover:text-teal-400 transition-colors">Terms of Service</a>
//           </div>
//         </div>
//       </div>

//       {/* Right side: Login Form */}
//       <div className="flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-40 bg-white relative">
//         <div className="w-full max-w-[400px] mx-auto">

//           <div className="mb-10 text-center lg:text-left">
//             <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-3">Welcome back</h2>
//             <p className="text-gray-500 text-lg">Enter your credentials to access your dashboard.</p>
//           </div>

//           {/* Quick Test Logins */}
//           <div className="mb-8 p-4 rounded-3xl bg-gray-50 border border-gray-100 shadow-inner">
//             <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 text-center">Demo Accounts</div>
//             <div className="grid grid-cols-2 gap-3">
//               <button
//                 onClick={() => testLogin("admin@company.com")}
//                 className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-teal-500 hover:text-teal-600 hover:shadow-md transition-all group font-semibold text-sm text-gray-600"
//               >
//                 <span className="group-hover:scale-110 transition-transform">👑</span> Admin
//               </button>
//               <button
//                 onClick={() => testLogin("hr@company.com")}
//                 className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-teal-500 hover:text-teal-600 hover:shadow-md transition-all group font-semibold text-sm text-gray-600"
//               >
//                 <span className="group-hover:scale-110 transition-transform">👤</span> HR Lead
//               </button>
//             </div>
//           </div>

//           <div className="space-y-6">
//             <div className="group">
//               <label className="block text-sm font-bold text-gray-700 mb-2 transition-colors group-focus-within:text-teal-600">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="name@company.com"
//                   className="w-full border-2 border-gray-100 bg-gray-50/50 px-5 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 focus:bg-white transition-all font-medium text-gray-800 placeholder:text-gray-400"
//                 />
//               </div>
//             </div>

//             <div className="group">
//               <div className="flex justify-between items-center mb-2">
//                 <label className="text-sm font-bold text-gray-700 transition-colors group-focus-within:text-teal-600">
//                   Password
//                 </label>
//                 <a href="#" className="text-xs font-bold text-teal-600 hover:text-teal-700 underline-offset-4 hover:underline">
//                   Forgot Password?
//                 </a>
//               </div>
//               <input
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
//                 className="w-full border-2 border-gray-100 bg-gray-50/50 px-5 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 focus:bg-white transition-all font-medium text-gray-800"
//               />
//             </div>

//             <div className="pt-4">
//               <button
//                 onClick={handleLogin}
//                 disabled={isLoading}
//                 className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-gray-200 transform active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
//               >
//                 {isLoading ? (
//                   <div className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
//                 ) : (
//                   <>
//                     Sign In to Dashboard
//                     <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
//                     </svg>
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>

//           <p className="mt-10 text-center text-sm text-gray-500 font-medium">
//             Don't have an account? <a href="#" className="text-teal-600 font-bold hover:underline">Contact Admin</a>
//           </p>

//         </div>
//       </div>
//     </div>
//   );
// }


import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "https://galacticos-traker.onrender.com";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (val) => {
    if (val.trim() && !val.trim().toLowerCase().endsWith("@galacticosnetwork.com")) {
      setEmailError("Please enter a valid @galacticosnetwork.com email.");
    } else {
      setEmailError("");
    }
  };

  const handleLogin = async () => {
    if (!email.trim().toLowerCase().endsWith("@galacticosnetwork.com")) {
      setEmailError("Please enter a valid @galacticosnetwork.com email.");
      return;
    }
    setEmailError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (res.ok && data.token) {
        login(data.token, data.user);
        navigate("/");
      } else {
        alert(data.message || "Invalid credentials");
      }

    } catch (error) {
      console.error(error);
      alert("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen flex text-gray-800 bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* Left side: Branding / Promotional */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-16 bg-[#020617] text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        
        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E")` }}>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center font-bold text-2xl shadow-[0_0_25px_rgba(20,184,166,0.3)] border border-white/20">
            G
          </div>
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Galacticos Tracking
          </span>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Enterprise Grade
          </div>
          <h1 className="text-6xl font-extrabold leading-[1.1] tracking-tight mb-8">
            Hire the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-100 to-blue-400">
              best talent
            </span>
            , faster.
          </h1>
          <p className="text-gray-400 text-xl leading-relaxed max-w-md font-light">
            Data-driven applicant tracking for modern recruitment teams and enterprise hiring managers.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm font-medium text-gray-500">
          <span>© 2026 Galacticos Network</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-teal-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-teal-400 transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-44 bg-white relative">
        <div className="w-full max-w-[420px] mx-auto">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-3">Welcome back</h2>
            <p className="text-slate-500 text-lg">Enter your details to access your account.</p>
          </div>

          {/* Quick Test Logins - Refined Design */}
          <div className="mb-8 p-1.5 rounded-[2rem] bg-slate-100/50 border border-slate-200 shadow-sm flex items-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4">Roles</div>
            <div className="flex-1 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => testLogin("admin@galacticosnetwork.com")}
                className="flex items-center justify-center gap-2 py-2 rounded-[1.5rem] bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-600 shadow-sm transition-all active:scale-95 font-bold text-xs text-slate-600"
              >
                👑 Admin
              </button>
              <button
                onClick={() => testLogin("hr@galacticosnetwork.com")}
                className="flex items-center justify-center gap-2 py-2 rounded-[1.5rem] bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-600 shadow-sm transition-all active:scale-95 font-bold text-xs text-slate-600"
              >
                👤 HR Lead
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Email Field */}
            <div className="group">
              <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-teal-600">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  placeholder="name@galacticosnetwork.com"
                  className={`w-full border-2 bg-slate-50/50 pl-11 pr-5 py-3.5 rounded-2xl outline-none focus:ring-4 focus:bg-white transition-all font-medium text-slate-800 ${emailError ? "border-red-400 focus:ring-red-500/5 focus:border-red-500" : "border-slate-100 focus:ring-teal-500/5 focus:border-teal-500"}`}
                />
              </div>
              {emailError && <p className="mt-1.5 text-xs font-medium text-red-500">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div className="group">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700 transition-colors group-focus-within:text-teal-600">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs font-bold text-teal-600 hover:text-teal-700 underline-offset-4 hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-slate-100 bg-slate-50/50 pl-11 pr-12 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500 focus:bg-white transition-all font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-teal-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-slate-200 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-slate-500 font-medium">
            New to the network? <a href="#" className="text-teal-600 font-bold hover:underline">Request access</a>
          </p>

        </div>
      </div>
    </div>
  );
}