import { useContext, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { AuthContext } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Keep the sidebar open on larger screens, and close it when switching to mobile.
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen((s) => !s);
  const closeSidebar = () => setSidebarOpen(false);
  const showSidebar = sidebarOpen;

  return (
    <div className="flex min-h-screen bg-slate-50/50 font-sans text-gray-800 selection:bg-teal-100 selection:text-teal-900">
      {/* Mobile backdrop (click to close) */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/25 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {showSidebar && (
        <Sidebar isOpen={showSidebar} isMobile={isMobile} onClose={closeSidebar} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Navbar onToggleSidebar={toggleSidebar} />

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}



