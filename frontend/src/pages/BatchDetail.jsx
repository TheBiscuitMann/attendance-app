
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBatch } from '../api/batches';
import { createStudent, updateStudent } from '../api/students';
import { createSession, saveAttendance, fetchSummary, fetchSessions } from '../api/attendance';

export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  
  const [batch, setBatch] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); 
  const [isLoading, setIsLoading] = useState(true);

  
  const [editingSessionId, setEditingSessionId] = useState(null);


  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState('');

  
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTopic, setSessionTopic] = useState('');
  const [attendanceMarks, setAttendanceMarks] = useState({}); 

  // --- SUMMARY & HISTORY TAB STATE ---
  const [summaryData, setSummaryData] = useState([]);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    loadBatchDetails();
  }, [batchId]);

  useEffect(() => {
    if (activeTab === 'summary') loadSummary();
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const loadBatchDetails = async () => {
    setIsLoading(true);
    const result = await fetchBatch(batchId);
    if (result.success) {
      setBatch(result.data);
      
      const initialMarks = {};
      result.data.students.forEach(s => initialMarks[s.id] = false);
      setAttendanceMarks(initialMarks);
    }
    setIsLoading(false);
  };

  const loadSummary = async () => {
    const result = await fetchSummary(batchId);
    if (result.success) setSummaryData(result.data);
  };

  const loadHistory = async () => {
    const result = await fetchSessions(batchId);
    if (result.success) setHistoryData(result.data);
  };

  // --- ATTENDANCE LOGIC ---
  const toggleAttendance = (id) => {
    setAttendanceMarks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const markAll = (status) => {
    const newMarks = {};
    batch.students.forEach(s => newMarks[s.id] = status);
    setAttendanceMarks(newMarks);
  };

  // --- NEW: LOAD PAST SESSION INTO ATTENDANCE TAB ---
  const handleLoadPastSession = (session) => {
    setEditingSessionId(session.id);
    setSessionDate(session.date);
    setSessionTopic(session.topic || '');
    
    // Map existing records out of history into the checkboxes
    const historicalMarks = {};
    
    batch.students.forEach(s => historicalMarks[s.id] = false);
    // Overwrite with the actual saved states from that session
    session.attendance.forEach(record => {
      historicalMarks[record.student] = record.present;
    });
    
    setAttendanceMarks(historicalMarks);
    setActiveTab('attendance'); // Bounce back to the form tab
  };

  // --- NEW: CANCEL EDIT MODE ---
  const handleCancelSessionEdit = () => {
    setEditingSessionId(null);
    setSessionDate(new Date().toISOString().split('T')[0]);
    setSessionTopic('');
    const initialMarks = {};
    batch.students.forEach(s => initialMarks[s.id] = false);
    setAttendanceMarks(initialMarks);
  };

  const handleSubmitAttendance = async () => {
    if (!sessionDate) return alert("Please select a date!");
    
    let targetSessionId = editingSessionId;

    // If we are NOT editing a past session, we must create a new session entry first
    if (!targetSessionId) {
      const sessionRes = await createSession(batchId, sessionDate, sessionTopic);
      if (!sessionRes.success) {
        alert("⚠️ Failed to initialize session. Note: You cannot create two separate sessions on the exact same date.");
        return;
      }
      targetSessionId = sessionRes.data.id;
    }

    // Format final checkbox payload
    const records = Object.keys(attendanceMarks).map(studId => ({
      student_id: parseInt(studId),
      present: attendanceMarks[studId]
    }));

    const saveRes = await saveAttendance(targetSessionId, records);
    if (saveRes.success) {
      alert("✨ Attendance updated and saved successfully!");
      setEditingSessionId(null);
      setSessionTopic('');
      setSessionDate(new Date().toISOString().split('T')[0]);
      setActiveTab('summary'); 
    } else {
      alert("Error writing attendance matrix to server.");
    }
  };

  // --- STUDENT CRUD LOGIC ---
  const handleAddStudent = async (e) => {
    e.preventDefault();
    const result = await createStudent(batchId, studentName, studentId);
    if (result.success) {
      setStudentName(''); setStudentId('');
      loadBatchDetails(); 
    }
  };

  const saveEdit = async (id) => {
    const result = await updateStudent(id, batchId, editName, editId);
    if (result.success) {
      setEditingRowId(null);
      loadBatchDetails();
    }
  };

  if (isLoading) return <div className="p-8 text-slate-500 font-medium animate-pulse">Loading secure dashboard...</div>;
  if (!batch) return <div className="p-8 text-red-500 font-bold">Batch structure mismatch.</div>;

  const sortedStudents = [...batch.students].sort((a, b) => a.student_id.localeCompare(b.student_id));
  const nonEligibleStudents = summaryData.filter(s => s.rate < 30);

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans">
      
      {/* Top Meta Info Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(`/courses/${batch.course}`)} className="text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1 rounded-md hover:bg-slate-50 font-bold shadow-sm transition-all">
              ← Back to Course Layout
            </button>
            <span className="bg-blue-50 text-[#1e3a8a] text-xs font-black px-2.5 py-1 rounded border border-blue-200 uppercase tracking-wider">
              {batch.name} {batch.section && `• ${batch.section}`}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Faculty Control Terminal</h1>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-slate-200/60 p-1 rounded-xl mb-8 border border-slate-300/40">
        {[
          { id: 'attendance', icon: '📝', label: 'Take Attendance' },
          { id: 'summary', icon: '📊', label: 'Attendance Summary' },
          { id: 'history', icon: '🕰️', label: 'Session History' },
          { id: 'students', icon: '👥', label: 'Manage Students' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2
              ${activeTab === tab.id ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* TAB 1: TAKE ATTENDANCE & EDIT MODE        */}
      {/* ========================================== */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          
          {/* Status Indicator Banner if in Edit Mode */}
          {editingSessionId && (
            <div className="bg-amber-50 border-b border-amber-200 p-3.5 px-6 flex justify-between items-center animate-fadeIn">
              <p className="text-amber-800 text-sm font-bold flex items-center gap-2">
                ⏳ <span>You are currently editing a historical record (Session ID: {editingSessionId}). Saving will overwrite this date.</span>
              </p>
              <button onClick={handleCancelSessionEdit} className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-3 py-1 rounded-md transition-colors">
                Cancel Edit Mode
              </button>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-end">
            <div className="flex flex-wrap gap-4 w-full lg:w-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">📅 Select Target Date</label>
                <input 
                  type="date" 
                  value={sessionDate} 
                  disabled={!!editingSessionId} // Date locked if editing an existing entry
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-700 bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div className="flex-1 min-w-[280px]">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">✍️ Academic Topic / Agenda</label>
                <input 
                  type="text" 
                  placeholder="e.g., Introduction to Compiler Construction"
                  value={sessionTopic} 
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none font-medium text-slate-800 placeholder-slate-400 bg-white"
                />
              </div>
            </div>
            
            <div className="flex gap-2 w-full lg:w-auto justify-end">
              <button onClick={() => markAll(true)} className="px-3.5 py-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 transition-colors">
                ✓ Check All Present
              </button>
              <button onClick={() => markAll(false)} className="px-3.5 py-2 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold hover:bg-rose-100 transition-colors">
                ✕ Reset All Absent
              </button>
            </div>
          </div>

          {/* Roster Sheet */}
          <div className="p-0">
            {sortedStudents.length === 0 ? (
              <p className="text-center text-slate-400 py-16 font-medium">No students registered to this batch template yet.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6 w-32">Academic ID</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4 text-right pr-6">Status Indicator</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student, index) => (
                    <tr key={student.id} 
                        onClick={() => toggleAttendance(student.id)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors
                        ${attendanceMarks[student.id] ? 'bg-emerald-50/20' : index % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-slate-50`}
                    >
                      <td className="p-4 pl-6 font-bold text-slate-700 tracking-tight">{student.student_id}</td>
                      <td className="p-4 font-semibold text-slate-800">{student.name}</td>
                      <td className="p-4 text-right pr-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs uppercase tracking-wide border transition-all
                          ${attendanceMarks[student.id] ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                          {attendanceMarks[student.id] ? '✓ Present' : '✕ Absent'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
             <button onClick={handleSubmitAttendance} className="bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-3 px-10 rounded-lg shadow-md transition-all text-sm tracking-wide uppercase">
                {editingSessionId ? '💾 Commit Changes' : '💾 Finalize & Save Attendance'}
             </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: ATTENDANCE SUMMARY                  */}
      {/* ========================================== */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Roster Eligibility Matrix</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Calculated based on a strict 30% examination threshold.</p>
            </div>
            {nonEligibleStudents.length > 0 && (
              <span className="bg-rose-50 text-rose-700 font-black px-4 py-1.5 rounded-lg text-xs border border-rose-200 uppercase tracking-wide flex items-center gap-2">
                🚨 {nonEligibleStudents.length} Student{nonEligibleStudents.length > 1 ? 's' : ''} barred from finals
              </span>
            )}
          </div>
          
          <div className="p-0">
            {summaryData.length === 0 ? (
              <p className="text-center text-slate-400 py-16 font-medium">Execute and save a session entry to build data visualizations.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Student ID</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4 text-center">Attended</th>
                    <th className="p-4 text-center">Absent</th>
                    <th className="p-4 text-center">Percentage</th>
                    <th className="p-4 text-right pr-6">Examination Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.sort((a,b) => a.student_id.localeCompare(b.student_id)).map((student, index) => (
                    <tr key={student.id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="p-4 pl-6 font-bold text-slate-700">{student.student_id}</td>
                      <td className="p-4 font-semibold text-slate-800">{student.name}</td>
                      <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/10">{student.present}</td>
                      <td className="p-4 text-center font-bold text-rose-600 bg-rose-50/10">{student.absent}</td>
                      <td className="p-4 text-center">
                        <span className={`font-black tracking-tight ${student.rate < 30 ? 'text-rose-600' : student.rate < 75 ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {student.rate}%
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        {student.rate < 30 ? (
                          <span className="bg-rose-100 text-rose-800 text-xs font-black px-2.5 py-1 rounded border border-rose-200 tracking-wide uppercase">🚫 Barred (Low)</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded border border-emerald-200 tracking-wide uppercase">Approved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: SESSION HISTORY                     */}
      {/* ========================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-fadeIn">
           <h3 className="text-lg font-bold text-slate-900 mb-1">Academic Logs</h3>
           <p className="text-xs text-slate-400 font-medium mb-6">Review past dates or select one to modify student check-ins.</p>
           {historyData.length === 0 ? (
             <p className="text-slate-400 py-6 font-medium">No archived sessions found for this batch template.</p>
           ) : (
             <div className="grid gap-4">
               {historyData.map(session => (
                 <div key={session.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center bg-white hover:border-blue-400 hover:shadow-sm transition-all group">
                   <div>
                     <p className="font-bold text-slate-800 text-lg flex items-center gap-2">
                       <span>📅</span> {session.date}
                     </p>
                     <p className="text-slate-500 text-sm font-medium mt-1">
                       <span className="text-slate-400 font-bold">Topic:</span> {session.topic || 'No curriculum notes recorded.'}
                     </p>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="hidden sm:inline-block bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                        {session.attendance.length} Verified Records
                      </span>
                      <button 
                        onClick={() => handleLoadPastSession(session)}
                        className="bg-blue-50 text-[#1e3a8a] border border-blue-200 hover:bg-[#1e3a8a] hover:text-white font-black text-xs uppercase tracking-wide px-4 py-2 rounded-lg transition-all"
                      >
                        ✏️ Edit Records
                      </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: MANAGE STUDENTS                     */}
      {/* ========================================== */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#1e3a8a]">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Enroll New Student</h2>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Registration ID</label>
                  <input type="text" required placeholder="e.g., 201-115-053" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Legal Name</label>
                  <input type="text" required placeholder="e.g., Ahsanul Haque" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] outline-none font-medium" />
                </div>
                <button type="submit" className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md mt-2 tracking-wide uppercase text-xs">Authorize Enrollment</button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Enrolled Academic Roster</h3>
                <span className="bg-blue-50 text-[#1e3a8a] text-xs font-bold px-3 py-1 rounded-full border border-blue-100">Total Size: {sortedStudents.length}</span>
              </div>
              <div className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">ID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4 text-right pr-6">Action Modifiers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((student, index) => (
                      <tr key={student.id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                        {editingRowId === student.id ? (
                          <>
                            <td className="p-3"><input value={editId} onChange={(e) => setEditId(e.target.value)} className="w-full px-2 py-1 border border-blue-400 rounded outline-none font-bold text-slate-700" /></td>
                            <td className="p-3"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-2 py-1 border border-blue-400 rounded outline-none font-semibold text-slate-800" /></td>
                            <td className="p-3 text-right pr-6 space-x-2 whitespace-nowrap">
                              <button onClick={() => saveEdit(student.id)} className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded font-bold hover:bg-emerald-700">Save</button>
                              <button onClick={() => setEditingRowId(null)} className="text-xs bg-slate-400 text-white px-2.5 py-1 rounded font-bold hover:bg-slate-500">Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4 pl-6 font-bold text-slate-700">{student.student_id}</td>
                            <td className="p-4 font-semibold text-slate-800">{student.name}</td>
                            <td className="p-4 text-right pr-6">
                              <button onClick={() => { setEditingRowId(student.id); setEditName(student.name); setEditId(student.student_id); }} className="text-blue-600 hover:text-blue-800 text-sm font-bold tracking-wide">Edit Profile</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}