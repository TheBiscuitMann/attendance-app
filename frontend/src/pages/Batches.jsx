// src/pages/Batches.jsx
import { useState, useEffect } from 'react';
import { fetchCourses } from '../api/courses';
import { fetchBatches, createBatch } from '../api/batches';

export default function Batches() {
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  
  // Form State
  const [selectedCourse, setSelectedCourse] = useState('');
  const [batchName, setBatchName] = useState('');
  const [section, setSection] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    const [coursesResult, batchesResult] = await Promise.all([
      fetchCourses(),
      fetchBatches()
    ]);
    
    if (coursesResult.success) setCourses(coursesResult.data);
    if (batchesResult.success) setBatches(batchesResult.data);
    setIsLoading(false);
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      alert("Please select a course first!");
      return;
    }

    const result = await createBatch(selectedCourse, batchName, section);
    if (result.success) {
      setBatchName('');
      setSection('');
      loadData(); // Refresh the lists
    } else {
      alert("Failed to create batch.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Batch Management</h1>
        <p className="text-slate-500 mt-1 font-medium">Organize your courses into sections and batches.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-[#1e3a8a]">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Batch</h2>
            <form onSubmit={handleAddBatch} className="space-y-4">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Select Course</label>
                <select 
                  required
                  value={selectedCourse} 
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] outline-none bg-white"
                >
                  <option value="" disabled>-- Choose a Course --</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Batch Name</label>
                <input 
                  type="text" required
                  placeholder="e.g., 53rd Batch"
                  value={batchName} onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Section (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., Section A"
                  value={section} onChange={(e) => setSection(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md mt-2"
              >
                Create Batch
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List of Batches */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Your Active Batches</h3>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <p className="text-center text-slate-500 py-8 font-medium">Loading batches...</p>
              ) : batches.length === 0 ? (
                <p className="text-center text-slate-500 py-12 font-medium">No batches created yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {batches.map((batch) => (
                    <div key={batch.id} className="p-5 border border-slate-200 rounded-lg hover:border-[#1e3a8a] hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-blue-100 text-[#1e3a8a] text-xs font-black px-2 py-1 rounded-md tracking-wider uppercase">
                          {batch.name} {batch.section && `- ${batch.section}`}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-md mt-2">
                         Students: {batch.student_count || 0}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 font-medium bg-slate-100 inline-block px-2 py-1 rounded">
                        Linked to Course ID: {batch.course}
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