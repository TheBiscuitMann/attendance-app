import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import { checkIsLoggedIn } from './api/auth';

import Courses from './pages/Courses';
import Batches from './pages/Batches';
import CourseDetail from './pages/CourseDetail';
import BatchDetail from './pages/BatchDetail';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SmartSync from './pages/SmartSync';

export default function App() {

  // Keeps signed-out visitors out of the app.
  const ProtectedRoute = ({ children }) => {
    if (!checkIsLoggedIn()) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // The mirror image: someone already signed in has no reason to see
  // the login or signup pages, so send them to the dashboard.
  const PublicRoute = ({ children }) => {
    if (checkIsLoggedIn()) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Everything below requires a valid session */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="batches" element={<Batches />} />
          <Route path="batches/:batchId" element={<BatchDetail />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="profile" element={<Profile />} />
          <Route path="sync" element={<SmartSync />} />
        </Route>

        {/* Any unknown URL goes home, which in turn bounces to /login
            if there's no session. */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}