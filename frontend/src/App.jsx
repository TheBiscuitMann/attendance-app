import { useState } from 'react'

function App() {
  
  const [activeCourseId, setActiveCourseId] = useState('CSE-415');

  
  const [courses, setCourses] = useState([
    {
      id: 'CSE-415',
      title: 'Compiler Construction',
      time: '10:00 AM - 11:30 AM',
      students: [
        { id: 1, name: "Rashma Jahan", roll: "231-115-101", status: "Unmarked" },
        { id: 2, name: "Fariha Rahman", roll: "231-115-102", status: "Unmarked" },
        { id: 3, name: "Mosaddeq Hossain", roll: "231-115-253", status: "Unmarked" },
        { id: 4, name: "Nazira Banu", roll: "231-115-104", status: "Unmarked" },
      ]
    },


    //testing my commits

    {
      id: 'CSE-416',
      title: 'Compiler Construction Lab',
      time: '9:00 AM - 11:30 AM',
      students: [
        { id: 1, name: "Rashma Jahan", roll: "231-115-101", status: "Unmarked" },
        { id: 2, name: "Fariha Rahman", roll: "231-115-102", status: "Unmarked" },
        { id: 3, name: "Mosaddeq Hossain", roll: "231-115-253", status: "Unmarked" },
        { id: 4, name: "Nazira Banu", roll: "231-115-104", status: "Unmarked" },
      ]
    },



    {
      id: 'CSE-311',
      title: 'Computer Networks',
      time: '12:00 PM - 1:30 PM',
      students: [
        { id: 5, name: "Chandler Bing", roll: "221-115-105", status: "Unmarked" },
        { id: 6, name: "Monica Geller", roll: "221-115-106", status: "Unmarked" },
        { id: 7, name: "Ross Geller", roll: "221-115-107", status: "Unmarked" },
        { id: 8, name: "Rachel Green", roll: "221-115-108", status: "Unmarked" },
        { id: 9, name: "Joey Tribbiani", roll: "221-115-109", status: "Unmarked" },
        { id: 10, name: "Phoebe Buffay", roll: "221-115-110", status: "Unmarked" },
      ]
    },

{
      id: 'CSE-312',
      title: 'Computer Networks Lab',
      time: '1:30 PM - 4:00 PM',
      students: [
        { id: 5, name: "Chandler Bing", roll: "221-115-105", status: "Unmarked" },
        { id: 6, name: "Monica Geller", roll: "221-115-106", status: "Unmarked" },
        { id: 7, name: "Ross Geller", roll: "221-115-107", status: "Unmarked" },
        { id: 8, name: "Rachel Green", roll: "221-115-108", status: "Unmarked" },
        { id: 9, name: "Joey Tribbiani", roll: "221-115-109", status: "Unmarked" },
        { id: 10, name: "Phoebe Buffay", roll: "221-115-110", status: "Unmarked" },
      ]
    },


    {
      id: 'CSE-469',
      title: 'Bioinformatics Computing',
      time: '3:00 PM - 4.30 PM',
      students: [
        { id: 5, name: "Chandler Bing", roll: "221-115-105", status: "Unmarked" },
        { id: 6, name: "Monica Geller", roll: "221-115-106", status: "Unmarked" },
        { id: 7, name: "Ross Geller", roll: "221-115-107", status: "Unmarked" },
        { id: 8, name: "Rachel Green", roll: "221-115-108", status: "Unmarked" },
        { id: 9, name: "Joey Tribbiani", roll: "221-115-109", status: "Unmarked" },
        { id: 10, name: "Phoebe Buffay", roll: "221-115-110", status: "Unmarked" },
      ]
    }


  ]);


  const activeCourse = courses.find(c => c.id === activeCourseId);


  const totalStudents = activeCourse.students.length;
  const presentCount = activeCourse.students.filter(s => s.status === 'Present' || s.status === 'Late').length;
  const markedCount = activeCourse.students.filter(s => s.status !== 'Unmarked').length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  
  const updateStatus = (studentId, clickedStatus) => {
    setCourses(prevCourses => prevCourses.map(course => {
      if (course.id === activeCourseId) {
        return {
          ...course,
          students: course.students.map(s => {
            if (s.id === studentId) {
              
              const newStatus = s.status === clickedStatus ? 'Unmarked' : clickedStatus;
              return { ...s, status: newStatus };
            }
            return s;
          })
        };
      }
      return course;
    }));
  };

  
  const markAllPresent = () => {
    setCourses(prevCourses => prevCourses.map(course => {
      if (course.id === activeCourseId) {
        return {
          ...course,
          students: course.students.map(s => 
            s.status === 'Unmarked' ? { ...s, status: 'Present' } : s
          )
        };
      }
      return course;
    }));
  };

  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-800 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Prezence</h1>
        </div>
        
        <div className="p-4 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Your Classes Today</p>
          <div className="space-y-2">
            {courses.map(course => (
              <button 
                key={course.id}
                onClick={() => setActiveCourseId(course.id)}
                className={`w-full text-left p-4 rounded-xl transition-all border-l-4 ${
                  activeCourseId === course.id 
                    ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <h3 className={`font-bold ${activeCourseId === course.id ? 'text-blue-700' : 'text-slate-700'}`}>
                  {course.id}
                </h3>
                <p className="text-sm opacity-80 line-clamp-1">{course.title}</p>
                <p className="text-xs mt-2 font-medium opacity-60">🕒 {course.time}</p>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 lg:p-10 overflow-y-auto">
        
        {/* Header with Prominent Date */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-semibold text-blue-600 mb-4 shadow-sm">
              <span>📅</span> {today}
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{activeCourse.title}</h2>
            <p className="text-slate-500 font-medium mt-1">{activeCourse.id} • {activeCourse.time}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={markAllPresent}
              className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-semibold shadow-sm"
            >
              Mark Remaining Present
            </button>
            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-sm">
              Save Attendance
            </button>
          </div>
        </header>

        {/* Dynamic Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-t-4 border-t-blue-500">
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Enrolled</p>
            <p className="text-3xl font-bold text-slate-800">{totalStudents}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-t-4 border-t-emerald-500">
            <p className="text-sm font-semibold text-slate-500 mb-1">Current Attendance</p>
            <p className="text-3xl font-bold text-emerald-600">{attendanceRate}%</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-t-4 border-t-amber-500">
            <p className="text-sm font-semibold text-slate-500 mb-1">Left to Mark</p>
            <p className="text-3xl font-bold text-amber-600">{totalStudents - markedCount}</p>
          </div>
        </div>

        {/* Interactive Roster Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Class Roster</h3>
            <span className="text-sm font-medium text-slate-500">{markedCount} of {totalStudents} marked</span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {activeCourse.students.map((student) => (
              <div key={student.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Student Info */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{student.roll}</p>
                  </div>
                </div>

                {/* Edit/Toggle Buttons */}
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
                  <button 
                    onClick={() => updateStatus(student.id, 'Present')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                      student.status === 'Present' 
                        ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                  >
                    Present
                  </button>
                  <button 
                    onClick={() => updateStatus(student.id, 'Late')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                      student.status === 'Late' 
                        ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                  >
                    Late
                  </button>
                  <button 
                    onClick={() => updateStatus(student.id, 'Absent')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                      student.status === 'Absent' 
                        ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                  >
                    Absent
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}

export default App