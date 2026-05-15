import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      
      {}
      <aside className="w-64 bg-[#1e3a8a] text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-2xl font-bold tracking-tight">Prezence</h1>
          <p className="text-xs text-blue-300 mt-1 font-medium">Metropolitan University</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/" className="block p-3 bg-blue-800 rounded-lg font-medium shadow-sm">Dashboard</a>
          <a href="/courses" className="block p-3 hover:bg-blue-800 rounded-lg font-medium transition-all text-blue-100">Course Management</a>
          <a href="/batches" className="block p-3 hover:bg-blue-800 rounded-lg font-medium transition-all text-blue-100">Batch Management</a>
          <a href="#" className="block p-3 hover:bg-blue-800 rounded-lg font-medium transition-all text-blue-100">Session History</a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white shadow-sm border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <h2 className="text-lg font-bold text-slate-700">Faculty Portal</h2>
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-all">
            <span className="text-sm font-semibold text-slate-700">Prof. Fariha</span>
            <div className="w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              F
            </div>
          </div>
        </header>

        {/* Dynamic Page Content Loads Here */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
}