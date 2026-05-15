export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Semester Overview</h1>
        <p className="text-slate-500 mt-1 font-medium">Welcome back. Here is your current academic summary.</p>
      </div>

      {/* Stats Cards with MU Colors */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#1e3a8a]">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Courses</p>
          <p className="text-3xl font-black text-slate-800">4</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Batches</p>
          <p className="text-3xl font-black text-slate-800">6</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Students</p>
          <p className="text-3xl font-black text-slate-800">185</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-red-600">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Records</p>
          <p className="text-3xl font-black text-slate-800">2</p>
        </div>
      </div>

      {/* Recent Activity Table Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Recent Attendance Activity</h3>
        </div>
        <div className="p-6 text-center text-slate-500 py-16 font-medium">
          Your class sessions will appear here once connected to the Django database.
        </div>
      </div>
    </div>
  )
}