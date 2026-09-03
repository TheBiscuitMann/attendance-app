// src/components/Layout.jsx
import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { PROFILE_EVENT } from '../api/profile';
import {
  DAYS,
  SCHEDULE_EVENT,
  formatTime,
  loadWeek,
  todayKey,
  todayLabel,
} from '../utils/schedule';

const NAVY = '#0B2A59';
const RED = '#D32F2F';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [userName, setUserName] = useState('Loading...');
  const [userInitial, setUserInitial] = useState('F');
  const [userEmail, setUserEmail] = useState('faculty@metrouni.edu.bd');

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [todayClasses, setTodayClasses] = useState([]);
  const profileRef = useRef(null);

  /* ── Profile ─────────────────────────────────────────────────── */

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('prezence_token');
      if (!token) return;
      try {
        const response = await fetch('http://127.0.0.1:8000/api/auth/me/', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const displayName =
            data.full_name || data.email.split('@')[0] || 'Faculty';
          setUserName(`Prof. ${displayName}`);
          setUserInitial(displayName.charAt(0).toUpperCase());
          setUserEmail(data.email);
        }
      } catch (error) {
        setUserName('Prof. Faculty');
      }
    };
    fetchProfile();
    // The Profile page fires this after a successful name change.
    window.addEventListener(PROFILE_EVENT, fetchProfile);
    return () => window.removeEventListener(PROFILE_EVENT, fetchProfile);
  }, []);

  /* ── Today's itinerary ───────────────────────────────────────── */

  const loadItinerary = () => {
    const stored = loadWeek();
    const classes = [...(stored[todayKey()] || [])].sort((a, b) =>
      (a.start || '').localeCompare(b.start || '')
    );
    setTodayClasses(classes);
  };

  useEffect(() => {
    loadItinerary();
    // The Schedule page fires this after every save.
    window.addEventListener(SCHEDULE_EVENT, loadItinerary);
    return () => window.removeEventListener(SCHEDULE_EVENT, loadItinerary);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('prezence_token');
    localStorage.removeItem('prezence_refresh');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className="w-64 text-white flex flex-col shadow-xl z-20"
        style={{ backgroundColor: NAVY }}
      >
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-black tracking-tight">Prezence</h1>
          <p className="text-[10px] text-blue-200 mt-1 font-bold tracking-widest
                        uppercase opacity-80">
            Metropolitan University
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          {[
            { to: '/', label: 'Dashboard', match: (p) => p === '/' },
            { to: '/courses', label: 'Course Management', match: (p) => p.startsWith('/courses') },
            { to: '/batches', label: 'Batches', match: (p) => p.startsWith('/batches') },
            { to: '/schedule', label: 'Schedule Manager', match: (p) => p.startsWith('/schedule'), icon: '📅' },
            { to: '/sync', label: 'Smart Sync', match: (p) => p.startsWith('/sync'), icon: '⚡' },
          ].map((item) => {
            const isActive = item.match(location.pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2 p-3 rounded-lg font-bold text-sm
                  transition-all duration-150 press
                  ${isActive
                    ? 'text-white shadow-md'
                    : 'text-blue-100 hover:bg-white/10 hover:translate-x-0.5'}`}
                style={isActive ? { backgroundColor: RED } : undefined}
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="press w-full flex items-center gap-2 p-3 rounded-lg font-bold
                       text-sm text-blue-100 hover:bg-white/10 transition-all duration-150"
          >
            <span aria-hidden="true">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        <header className="h-16 bg-white shadow-sm border-b border-slate-200 flex
                           items-center justify-between px-8 z-30">
          <h2 className="text-lg font-bold text-slate-700">Faculty Portal</h2>

          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-2
                         rounded-full border border-transparent hover:border-slate-200
                         transition-all select-none"
            >
              <span className="text-sm font-bold text-slate-700 pl-2">{userName}</span>
              <div
                className="w-9 h-9 text-white rounded-full flex items-center justify-center
                           font-black text-sm shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: RED }}
              >
                {userInitial}
              </div>
            </div>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl
                              shadow-2xl border border-slate-200 overflow-hidden
                              origin-top-right animate-fadeIn">

                <div className="p-5 text-center relative overflow-hidden"
                     style={{ backgroundColor: NAVY }}>
                  <div
                    className="w-14 h-14 mx-auto text-white rounded-full flex items-center
                               justify-center font-black text-2xl shadow-md border-2
                               border-white mb-2 relative z-10"
                    style={{ backgroundColor: RED }}
                  >
                    {userInitial}
                  </div>
                  <h3 className="text-white font-bold text-lg relative z-10">{userName}</h3>
                  <p className="text-blue-200 text-xs font-medium relative z-10">{userEmail}</p>
                </div>

                <div className="p-4 border-b border-slate-100 bg-slate-50 max-h-60
                                overflow-y-auto thin-scroll">
                  <p className="text-xs font-bold text-slate-400 uppercase
                                tracking-wider mb-3">
                    📅 {todayLabel()}'s Itinerary
                  </p>

                  {todayClasses.length === 0 ? (
                    <div className="text-center py-4 bg-white rounded-lg border
                                    border-slate-200 border-dashed">
                      <p className="text-xs text-slate-500 font-bold">
                        No classes scheduled for today.
                      </p>
                    </div>
                  ) : (
                    todayClasses.map((cls, idx) => (
                      <div
                        key={cls.id || idx}
                        className="flex items-start gap-3 mb-3 last:mb-0 bg-white p-2.5
                                   rounded-lg border border-slate-200 shadow-sm"
                      >
                        <div
                          className="w-1.5 self-stretch min-h-[36px] rounded-full"
                          style={{ backgroundColor: idx % 2 === 0 ? RED : NAVY }}
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">
                            {cls.title}
                          </p>
                          <p className="text-xs font-bold mt-1 flex items-center gap-1"
                             style={{ color: NAVY }}>
                            🕒 {cls.start ? formatTime(cls.start) : 'TBA'}
                            {cls.end && ` – ${formatTime(cls.end)}`}
                            <span className="text-slate-400">|</span>
                            📍 {cls.room || 'TBA'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 bg-white">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="press w-full text-left px-4 py-2 text-sm font-bold
                               text-slate-600 hover:bg-slate-50 rounded-lg
                               transition-colors flex items-center gap-2"
                  >
                    ⚙️ Profile Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto thin-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}