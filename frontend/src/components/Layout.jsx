// src/components/Layout.jsx
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // States for our dynamic user profile
  const [userName, setUserName] = useState('Loading...');
  const [userInitial, setUserInitial] = useState('F');

  // Fetch the logged-in user's data when the layout loads
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('prezence_token');
      if (!token) return;

      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/me/', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // If full_name is blank, fall back to email, and split at the '@' so it looks clean
          const displayName = data.full_name || data.email.split('@')[0] || 'Faculty';
          
          setUserName(`Prof. ${displayName}`);
          setUserInitial(displayName.charAt(0).toUpperCase()); // Grabs the first letter for the red circle!
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserName('Prof. Fariha'); // Fallback just in case
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('prezence_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      
      {/* ── MU Branded Sidebar ── */}
      <aside className="w-64 bg-[#0B2A59] text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-black tracking-tight">Prezence</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium tracking-wide uppercase">Metropolitan University</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <a 
            href="/" 
            className={`block p-3 rounded-lg font-bold transition-all ${location.pathname === '/' ? 'bg-[#D32F2F] text-white shadow-md' : 'text-blue-100 hover:bg-[#081e40]'}`}
          >
            Dashboard
          </a>
          <a 
            href="/courses" 
            className={`block p-3 rounded-lg font-bold transition-all ${location.pathname.includes('/courses') ? 'bg-[#D32F2F] text-white shadow-md' : 'text-blue-100 hover:bg-[#081e40]'}`}
          >
            Course Management
          </a>
          {/* Batch Management and Session History have been permanently removed! */}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full text-left p-3 text-blue-200 hover:text-white hover:bg-[#081e40] rounded-lg font-bold transition-all text-sm flex items-center gap-2"
          >
            <span>🚪</span> Secure Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white shadow-sm border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <h2 className="text-lg font-bold text-slate-700">Faculty Portal</h2>
          
          {/* Dynamic Profile Section */}
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-2 rounded-full border border-transparent hover:border-slate-200 transition-all">
            <span className="text-sm font-bold text-slate-700 pl-2">{userName}</span>
            <div className="w-9 h-9 bg-[#D32F2F] text-white rounded-full flex items-center justify-center font-black text-sm shadow-sm">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}