import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';
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

const PrivateRoute = ({ children }) => {
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
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

      {/* Protected Admin Routes */}
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/documents" element={<PrivateRoute><Documents /></PrivateRoute>} />
      <Route path="/questions" element={<PrivateRoute><Questions /></PrivateRoute>} />
      <Route path="/quizzes" element={<PrivateRoute><Quizzes /></PrivateRoute>} />
      <Route path="/question-papers" element={<PrivateRoute><QuestionPapers /></PrivateRoute>} />
      <Route path="/attempts" element={<PrivateRoute><Attempts /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

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
