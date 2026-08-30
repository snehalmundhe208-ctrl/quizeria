import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AdminLogin from './pages/AdminLogin';
import TeacherLogin from './pages/TeacherLogin';
import TeacherRegister from './pages/TeacherRegister';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentAttempts from './pages/StudentAttempts';
import TeachersManagement from './pages/TeachersManagement';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';
import Landing from './pages/Landing';
import Settings from './pages/Settings';
import QuestionPapers from './pages/QuestionPapers';
import Quizzes from './pages/Quizzes';
import Questions from './pages/Questions';
import Documents from './pages/Documents';
import StudentQuizLanding from './pages/StudentQuizLanding';
import StudentQuizTake from './pages/StudentQuizTake';
import StudentQuizResult from './pages/StudentQuizResult';
import Attempts from './pages/Attempts';
import Analytics from './pages/Analytics';

const Layout = ({ children }) => {
  return (
    <div className="flex bg-slate-950 min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950">
        {children}
      </main>
    </div>
  );
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (allowedRoles.includes('STUDENT')) {
      return <Navigate to="/student/login" replace />;
    }
    return <Navigate to="/teacher/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
    if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  if (user.role === 'STUDENT') {
    return children;
  }

  return <Layout>{children}</Layout>;
};

const HomeRoute = () => {
  const { user } = useAuth();
  if (!user) {
    return <Landing />;
  }
  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user.role === 'TEACHER') {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  if (user.role === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />;
  }
  return <Landing />;
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/admin/login" element={!user ? <AdminLogin /> : <Navigate to="/" replace />} />
      <Route path="/teacher/login" element={!user ? <TeacherLogin /> : <Navigate to="/" replace />} />
      <Route path="/teacher/register" element={!user ? <TeacherRegister /> : <Navigate to="/" replace />} />
      <Route path="/student/login" element={!user ? <StudentLogin /> : <Navigate to="/" replace />} />
      <Route path="/student/register" element={!user ? <StudentRegister /> : <Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/teacher/login" replace />} />
      <Route path="/register" element={<Navigate to="/teacher/register" replace />} />

      {/* Root redirect */}
      <Route path="/" element={<HomeRoute />} />

      {/* Admin Specific Dashboard & Actions */}
      <Route path="/admin/dashboard" element={<RoleRoute allowedRoles={['ADMIN']}><Dashboard /></RoleRoute>} />
      <Route path="/admin/teachers" element={<RoleRoute allowedRoles={['ADMIN']}><TeachersManagement /></RoleRoute>} />

      {/* Teacher Specific Dashboard & Actions */}
      <Route path="/teacher/dashboard" element={<RoleRoute allowedRoles={['TEACHER']}><Dashboard /></RoleRoute>} />
      <Route path="/documents" element={<RoleRoute allowedRoles={['TEACHER']}><Documents /></RoleRoute>} />
      <Route path="/questions" element={<RoleRoute allowedRoles={['TEACHER']}><Questions /></RoleRoute>} />
      <Route path="/quizzes" element={<RoleRoute allowedRoles={['TEACHER']}><Quizzes /></RoleRoute>} />
      <Route path="/question-papers" element={<RoleRoute allowedRoles={['TEACHER']}><QuestionPapers /></RoleRoute>} />
      <Route path="/attempts" element={<RoleRoute allowedRoles={['TEACHER']}><Attempts /></RoleRoute>} />
      <Route path="/analytics" element={<RoleRoute allowedRoles={['TEACHER']}><Analytics /></RoleRoute>} />

      {/* Shared Admin/Teacher Settings */}
      <Route path="/settings" element={<RoleRoute allowedRoles={['ADMIN', 'TEACHER']}><Settings /></RoleRoute>} />

      {/* Student Dashboard */}
      <Route path="/student/dashboard" element={<RoleRoute allowedRoles={['STUDENT']}><StudentAttempts /></RoleRoute>} />
      <Route path="/student/attempts" element={<Navigate to="/student/dashboard" replace />} />

      {/* Public Student Assessment Routes */}
      <Route path="/quiz/:shareCode" element={<StudentQuizLanding />} />
      <Route path="/quiz/:shareCode/take/:attemptId" element={<StudentQuizTake />} />
      <Route path="/quiz/result/:attemptId" element={<StudentQuizResult />} />

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
