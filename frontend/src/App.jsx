
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { checkIsLoggedIn } from './api/auth';

import Courses from './pages/Courses';
import Batches from './pages/Batches';
import CourseDetail from './pages/CourseDetail';
import BatchDetail from './pages/BatchDetail';

export default function App() {
  
// security guard

  const ProtectedRoute = ({ children }) => {
    if (!checkIsLoggedIn()) {
      
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        
        {}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes - Must be logged in */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<Courses />} /> {}
          <Route path="batches" element={<Batches />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="batches/:batchId" element={<BatchDetail />} />
          
          {}
        </Route>

      </Routes>
    </BrowserRouter>
  );
}