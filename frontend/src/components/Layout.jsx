// src/components/Layout.jsx
import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { PROFILE_EVENT, fetchProfile as fetchProfileApi } from '../api/profile';
import { clearTokens } from '../api/client';
import {
  SCHEDULE_EVENT,
  formatTime,
  fetchWeek,
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
  // Mobile only: the sidebar becomes a slide-in drawer. On lg+ screens
  // it's permanently visible and this state is ignored.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [todayClasses, setTodayClasses] = useState([]);
  const profileRef = useRef(null);

  // Navigating anywhere closes the drawer — a teacher tapping
  // "Batches" expects to land there, not to have to close a menu.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  /* ── Profile ─────────────────────────────────────────────────── */

  useEffect(() => {
    const fetchProfile = async () => {
      const result = await fetchProfileApi();
      if (result.success) {
        const data = result.data;
        const displayName =
          data.full_name || data.email.split('@')[0] || 'Faculty';
        setUserName(`Prof. ${displayName}`);
        setUserInitial(displayName.charAt(0).toUpperCase());
        setUserEmail(data.email);
      } else {
        setUserName('Prof. Faculty');
      }
    };
    fetchProfile();
    // The Profile page fires this after a successful name change.
    window.addEventListener(PROFILE_EVENT, fetchProfile);
    return () => window.removeEventListener(PROFILE_EVENT, fetchProfile);
  }, []);

  /* ── Today's itinerary ───────────────────────────────────────── */

  const loadItinerary = async () => {
    const result = await fetchWeek();
    if (result.success) {
      setTodayClasses(result.week[todayKey()] || []);
    }
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
    clearTokens();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">

      {/* ── Mobile backdrop ─────────────────────────────────────── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {/* Phones: off-canvas drawer, slides in over a backdrop.
          lg and up: static column, exactly as before. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 text-white flex flex-col shadow-xl
                    transform transition-transform duration-200 ease-out
                    lg:static lg:z-20 lg:translate-x-0 lg:transform-none
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: NAVY, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Prezence</h1>
            <p className="text-[10px] text-blue-200 mt-1 font-bold tracking-widest
                          uppercase opacity-80">
              Metropolitan University
            </p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="press lg:hidden text-blue-200 hover:text-white text-xl leading-none
                       p-1 -mr-1 -mt-1"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto thin-scroll">
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

        <header
          className="h-16 bg-white shadow-sm border-b border-slate-200 flex
                     items-center justify-between px-4 sm:px-6 lg:px-8 z-30"
          style={{
            // iOS standalone mode draws the page under the status bar /
            // Dynamic Island (viewport-fit=cover). Grow the header by
            // that inset so its buttons stay reachable. Zero everywhere
            // else, so desktop and Android are untouched.
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(4rem + env(safe-area-inset-top))',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="press lg:hidden text-slate-600 hover:text-slate-900 p-1 -ml-1"
              aria-label="Open menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                   aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-700 truncate">
              Faculty Portal
            </h2>
          </div>

          <div className="relative flex-shrink-0" ref={profileRef}>
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-2
                         rounded-full border border-transparent hover:border-slate-200
                         transition-all select-none"
            >
              <span className="hidden sm:block text-sm font-bold text-slate-700 pl-2">
                {userName}
              </span>
              <div
                className="w-9 h-9 text-white rounded-full flex items-center justify-center
                           font-black text-sm shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: RED }}
              >
                {userInitial}
              </div>
            </div>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)]
                              bg-white rounded-xl
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

        <main
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto thin-scroll"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}