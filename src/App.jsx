import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './Home';
import StudentDashboard from './student/Dashboard';
import Courses from './student/Courses';
import MyCourses from './student/Mycourses';
import LearningPaths from './student/Learningpaths';
import Certificates from './student/Certificates';
import Labs from './student/Labs';
import Lesson from './student/Lessons';
import Exercise from './exercise';
import InstructorDashboard from './Instructordashboard';
import AdminDashboard from './Admin/Admindashboard';
import Login from './Login';
import Register from './student/Register';
import Results from './student/Results';
import Settings from './assets/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Instructor Dashboard */}
          <Route 
            path="/instructor" 
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <InstructorDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin Dashboard */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Platform & Student Feature Routes */}
          <Route path="/courses" element={<Courses />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/learning-paths" element={<LearningPaths />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/lesson" element={<Lesson />} />
          <Route path="/exercise" element={<Exercise />} />
          <Route path="/results" element={<Results />} />
          <Route path="/settings" element={<Settings />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
