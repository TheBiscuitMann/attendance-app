// src/pages/Courses.jsx
import { useState, useEffect } from 'react';
import { fetchCourses, createCourse } from '../api/courses';
import { useNavigate } from 'react-router-dom';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  // Load courses immediately when the page opens
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    const result = await fetchCourses();
    if (result.success) {
      setCourses(result.data);
    }
    setIsLoading(false);
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    const result = await createCourse(code, name);
    if (result.success) {
      setCode(''); // Clear the input
      setName('');
      loadCourses(); // Refresh the list to show the new course
    } else {
      alert("Failed to create course. Check console.");
      console.log(result.error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Course Management</h1>
        <p className="text-slate-500 mt-1 font-medium">Create and manage your academic courses.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Create Course Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#1e3a8a]">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Course</h2>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Course Code</label>
                <input 
                  type="text" required
                  placeholder="e.g., CSE-416"
                  value={code} onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Course Name</label>
                <input 
                  type="text" required
                  placeholder="e.g., Compiler Construction"
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md mt-2"
              >
                Create Course
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List of Courses */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Your Active Courses</h3>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <p className="text-center text-slate-500 py-8 font-medium">Loading courses...</p>
              ) : courses.length === 0 ? (
                <p className="text-center text-slate-500 py-12 font-medium">You haven't created any courses yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <div 
                      key={course.id} 
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="p-5 border border-slate-200 rounded-lg hover:border-[#1e3a8a] hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-red-100 text-red-700 text-xs font-black px-2 py-1 rounded-md tracking-wider">
                          {course.code}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg group-hover:text-[#1e3a8a] transition-colors">
                        {course.name}
                      </h4>
                      <p className="text-sm text-slate-500 mt-2 font-medium">
                        {course.batches ? course.batches.length : 0} Batches Connected
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}