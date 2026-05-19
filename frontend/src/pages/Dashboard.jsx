
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCourses } from '../api/courses';

export default function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time calculated stats
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalBatches: 0,
    totalStudents: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    const result = await fetchCourses();
    
    if (result.success) {
      const fetchedCourses = result.data;
      setCourses(fetchedCourses);
      
      // calculate exact totals from Django's nested API response!
      let batchesCount = 0;
      let studentsCount = 0;
      
      fetchedCourses.forEach(course => {
        batchesCount += course.batches ? course.batches.length : 0;
        if (course.batches) {
          course.batches.forEach(batch => {
            studentsCount += batch.student_count || 0;
          });
        }
      });

      setStats({
        totalCourses: fetchedCourses.length,
        totalBatches: batchesCount,
        totalStudents: studentsCount
      });
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="p-8 text-slate-500 font-medium animate-pulse">Loading MU Faculty Dashboard...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans">
      
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#0B2A59] tracking-tight">Semester Overview</h1>
        <p className="text-slate-500 mt-1 font-medium">Welcome back. Here is your live academic summary.</p>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Navy Blue Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-[#0B2A59] hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Courses</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-black text-[#0B2A59]">{stats.totalCourses}</h2>
            <div className="bg-[#0B2A59]/10 text-[#0B2A59] p-2 rounded-lg">
              📚
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-[#D32F2F] hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Batches</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-black text-[#D32F2F]">{stats.totalBatches}</h2>
            <div className="bg-[#D32F2F]/10 text-[#D32F2F] p-2 rounded-lg">
              🏢
            </div>
          </div>
        </div>

        {/* Slate/Success Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-emerald-600 hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Enrolled Students</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-black text-emerald-700">{stats.totalStudents}</h2>
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
              👥
            </div>
          </div>
        </div>

      </div>

      {/* Quick Access Courses Grid */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#0B2A59] mb-4">Quick Access: Your Courses</h2>
        
        {courses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <p className="text-slate-500 font-medium mb-4">You have not created any courses yet.</p>
            <button 
              onClick={() => navigate('/courses')}
              className="bg-[#0B2A59] hover:bg-[#081e40] text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Go to Course Management
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div 
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#D32F2F] hover:shadow-md transition-all cursor-pointer group flex flex-col"
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-slate-100 text-[#0B2A59] text-xs font-black px-2.5 py-1 rounded-md tracking-wider border border-slate-200">
                      {course.code}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-[#D32F2F] transition-colors leading-tight">
                    {course.name}
                  </h3>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {course.batches ? course.batches.length : 0} Batches
                  </span>
                  <span className="text-[#D32F2F] font-black text-xs uppercase tracking-wide group-hover:translate-x-1 transition-transform">
                    Manage →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}