// src/pages/CourseDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCourse } from '../api/courses';
import { createBatch } from '../api/batches';

export default function CourseDetail() {
  const { courseId } = useParams(); // Grabs the ID from the URL!
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [section, setSection] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourseDetails();
  }, [courseId]);

  const loadCourseDetails = async () => {
    setIsLoading(true);
    const result = await fetchCourse(courseId);
    if (result.success) {
      setCourse(result.data);
    }
    setIsLoading(false);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    const result = await createBatch(courseId, batchName, section);
    if (result.success) {
      setBatchName('');
      setSection('');
      loadCourseDetails(); 
    } else {
      alert("Failed to create batch.");
    }
  };

  if (isLoading) return <div className="p-8 text-slate-500 font-medium">Loading course data...</div>;
  if (!course) return <div className="p-8 text-red-500 font-bold">Course not found.</div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Back Button */}
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/courses')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-lg font-bold transition-all">
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{course.code}: {course.name}</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage batches and sections for this course.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Create Batch Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Add Batch to {course.code}</h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Batch Name</label>
                <input 
                  type="text" required placeholder="e.g., 53rd Batch"
                  value={batchName} onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Section (Optional)</label>
                <input 
                  type="text" placeholder="e.g., Section A"
                  value={section} onChange={(e) => setSection(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md mt-2">
                Create Batch
              </button>
            </form>
          </div>
        </div>

        {/* Right: List of Batches inside this course */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Batches in this Course</h3>
            </div>
            <div className="p-6">
              {course.batches.length === 0 ? (
                <p className="text-center text-slate-500 py-8 font-medium">No batches created for this course yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.batches.map((batch) => (
                    <div 
                      key={batch.id} 
                      onClick={() => navigate(`/batches/${batch.id}`)}
                      className="p-5 border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group cursor-pointer"
                    >
                      <h4 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                        {batch.name} {batch.section && `(${batch.section})`}
                      </h4>
                      <p className="text-sm text-slate-500 mt-2 font-medium">
                        Students: {batch.student_count || 0}
                      </p>
                      <div className="mt-3 text-xs font-bold text-blue-500 uppercase tracking-wider">
                        Enter Batch →
                      </div>
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