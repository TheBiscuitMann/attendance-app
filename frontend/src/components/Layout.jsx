// src/components/Layout.jsx
import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Profile State
  const [userName, setUserName] = useState('Loading...');
  const [userInitial, setUserInitial] = useState('F');
  const [userEmail, setUserEmail] = useState('faculty@metrouni.edu.bd');
  
  // Dropdown & Schedule State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [todayClasses, setTodayClasses] = useState([]);
  const profileRef = useRef(null);

  // Profile Schedule Manager State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [facultyCourses, setFacultyCourses] = useState([]);
  const [scheduleData, setScheduleData] = useState({});

  // 1. Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('prezence_token');
      if (!token) return;
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/me/', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const displayName = data.full_name || data.email.split('@')[0] || 'Faculty';
          setUserName(`Prof. ${displayName}`);
          setUserInitial(displayName.charAt(0).toUpperCase());
          setUserEmail(data.email);
        }
      } catch (error) {
        setUserName('Prof. Fariha'); 
      }
    };
    fetchProfile();
  }, []);

  // 2. Load the Profile's Itinerary
  const loadItinerary = () => {
    const schedules = JSON.parse(localStorage.getItem('mu_profile_schedules') || '{}');
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayString = daysMap[new Date().getDay()];
    
    // Filter for today and sort by time
    const activeToday = Object.values(schedules).filter(s => s.days && s.days.includes(todayString));
    activeToday.sort((a,b) => a.time.localeCompare(b.time));
    setTodayClasses(activeToday);
  };

  useEffect(() => {
    loadItinerary();
    window.addEventListener('profileScheduleUpdated', loadItinerary);
    return () => window.removeEventListener('profileScheduleUpdated', loadItinerary);
  }, []);

  // 3. Click outside logic for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. OPEN THE SCHEDULE MANAGER
  const openScheduleManager = async () => {
    setIsProfileOpen(false); // Close dropdown
    setIsScheduleModalOpen(true); // Open Modal
    
    // Fetch the faculty's courses
    const token = localStorage.getItem('prezence_token');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/courses/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFacultyCourses(data);
        
        // Load existing saved schedules into the form
        const savedSchedules = JSON.parse(localStorage.getItem('mu_profile_schedules') || '{}');
        setScheduleData(savedSchedules);
      }
    } catch (error) {
      console.error("Failed to load courses for schedule manager");
    }
  };

  const handleScheduleChange = (courseId, field, value) => {
    setScheduleData(prev => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        [field]: value
      }
    }));
  };

  const toggleModalDay = (courseId, day) => {
    setScheduleData(prev => {
      const currentDays = prev[courseId]?.days || [];
      const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day];
      return { ...prev, [courseId]: { ...prev[courseId], days: newDays } };
    });
  };

  const saveMasterSchedule = () => {
    const finalData = { ...scheduleData };
    facultyCourses.forEach(course => {
      if (finalData[course.id]) {
        finalData[course.id].title = `${course.code}: ${course.name}`;
      }
    });

    localStorage.setItem('mu_profile_schedules', JSON.stringify(finalData));
    window.dispatchEvent(new Event('profileScheduleUpdated'));
    setIsScheduleModalOpen(false);
    alert("✅ Master Schedule Updated!");
  };

  const handleLogout = () => {
    localStorage.removeItem('prezence_token');
    navigate('/login');
  };

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      
      {/* ── MU Branded Sidebar ── */}
      <aside className="w-64 bg-[#0B2A59] text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-black tracking-tight">Prezence</h1>
          <p className="text-[10px] text-blue-200 mt-1 font-bold tracking-widest uppercase opacity-80">Metropolitan University</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/" className={`block p-3 rounded-lg font-bold transition-all ${location.pathname === '/' ? 'bg-[#D32F2F] text-white shadow-md' : 'text-blue-100 hover:bg-[#081e40]'}`}>
            Dashboard
          </a>
          <a href="/courses" className={`block p-3 rounded-lg font-bold transition-all ${location.pathname.includes('/courses') ? 'bg-[#D32F2F] text-white shadow-md' : 'text-blue-100 hover:bg-[#081e40]'}`}>
            Course Management
          </a>
          
          {/* ⚡ THE NEW SMART SYNC LINK ⚡ */}
          <a href="/sync" className={`block p-3 rounded-lg font-bold transition-all flex items-center gap-2 ${location.pathname.includes('/sync') ? 'bg-[#D32F2F] text-white shadow-md' : 'text-blue-100 hover:bg-[#081e40]'}`}>
            <span>⚡</span> Smart Sync
          </a>
        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <header className="h-16 bg-white shadow-sm border-b border-slate-200 flex items-center justify-between px-8 z-30">
          <h2 className="text-lg font-bold text-slate-700">Faculty Portal</h2>
          
          <div className="relative" ref={profileRef}>
            <div 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-2 rounded-full border border-transparent hover:border-slate-200 transition-all select-none"
            >
              <span className="text-sm font-bold text-slate-700 pl-2">{userName}</span>
              <div className="w-9 h-9 bg-[#D32F2F] text-white rounded-full flex items-center justify-center font-black text-sm shadow-sm transition-transform hover:scale-105">
                {userInitial}
              </div>
            </div>

            {/* ── The Dynamic Dropdown Menu ── */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden origin-top-right animate-fadeIn">
                
                <div className="bg-[#0B2A59] p-5 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 pattern-diagonal-lines"></div>
                  <div className="w-14 h-14 mx-auto bg-[#D32F2F] text-white rounded-full flex items-center justify-center font-black text-2xl shadow-md border-2 border-white mb-2 relative z-10">{userInitial}</div>
                  <h3 className="text-white font-bold text-lg relative z-10">{userName}</h3>
                  <p className="text-blue-200 text-xs font-medium relative z-10">{userEmail}</p>
                </div>

                {/* ── DYNAMIC TODAY'S SCHEDULE ── */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 max-h-60 overflow-y-auto">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">📅 {todayName}'s Itinerary</p>
                    <button onClick={openScheduleManager} className="text-xs font-bold text-[#0B2A59] hover:underline bg-blue-50 px-2 py-1 rounded">✏️ Edit</button>
                  </div>
                  
                  {todayClasses.length === 0 ? (
                     <div className="text-center py-4 bg-white rounded-lg border border-slate-200 border-dashed">
                       <p className="text-xs text-slate-500 font-bold">No classes scheduled for today.</p>
                     </div>
                  ) : (
                    todayClasses.map((cls, idx) => (
                      <div key={idx} className="flex items-start gap-3 mb-3 last:mb-0 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                        <div className={`w-1.5 h-full min-h-[36px] rounded-full ${idx % 2 === 0 ? 'bg-[#D32F2F]' : 'bg-[#0B2A59]'}`}></div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{cls.title}</p>
                          <p className="text-xs font-bold text-[#0B2A59] mt-1 flex items-center gap-1">
                            🕒 {cls.time || 'TBA'} <span className="text-slate-400">|</span> 📍 {cls.room || 'TBA'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 bg-white">
                  <button onClick={openScheduleManager} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                    ⚙️ Schedule Manager
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 mt-1">
                    🚪 Secure Logout
                  </button>
                </div>

              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
        
      </div>

      {/* ========================================== */}
      {/* ── MASTER SCHEDULE MODAL (POPS OVER APP) ── */}
      {/* ========================================== */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            
            {/* Modal Header */}
            <div className="bg-[#0B2A59] p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black tracking-tight">Master Schedule Manager</h2>
                <p className="text-blue-200 text-sm font-medium mt-1">Configure timings and rooms for all your assigned courses.</p>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-all">✕</button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {facultyCourses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 font-bold">You haven't created any courses yet!</p>
                  <p className="text-sm text-slate-400 mt-2">Go to Course Management to create your first class.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {facultyCourses.map(course => (
                    <div key={course.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                        <span className="bg-red-100 text-red-700 text-xs font-black px-2 py-1 rounded tracking-wider">{course.code}</span>
                        <h3 className="font-bold text-slate-800 text-lg">{course.name}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">📍 Room Number</label>
                          <input 
                            type="text" placeholder="e.g., Room 302"
                            value={scheduleData[course.id]?.room || ''}
                            onChange={(e) => handleScheduleChange(course.id, 'room', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0B2A59] outline-none text-sm font-medium text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">🕒 Time</label>
                          <input 
                            type="time" 
                            value={scheduleData[course.id]?.time || ''}
                            onChange={(e) => handleScheduleChange(course.id, 'time', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0B2A59] outline-none text-sm font-medium text-slate-700"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">📅 Days</label>
                          <div className="flex flex-wrap gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <button 
                                key={day} onClick={() => toggleModalDay(course.id, day)}
                                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all border
                                  ${scheduleData[course.id]?.days?.includes(day) ? 'bg-[#0B2A59] text-white border-[#0B2A59]' : 'bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100'}`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
              <button onClick={() => setIsScheduleModalOpen(false)} className="px-5 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm">Cancel</button>
              <button onClick={saveMasterSchedule} className="px-6 py-2.5 rounded-lg font-bold text-white bg-[#D32F2F] hover:bg-[#b72828] shadow-md transition-all text-sm uppercase tracking-wide">💾 Save Master Schedule</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}