import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const quizLink = searchParams.get('quizLink');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(username, password);
      
      if (quizLink && loggedUser.role === 'STUDENT') {
        navigate(`/quiz/${quizLink}`);
      } else if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'TEACHER') {
        navigate('/teacher/dashboard');
      } else if (loggedUser.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <GraduationCap className="h-12 w-12 text-indigo-500" />
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">StudyForge AI</h2>
        </div>
        <p className="mt-2 text-center text-sm text-slate-500 font-semibold uppercase tracking-wider">
          Unified Portal Sign In
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 border border-slate-800 shadow-xl rounded-2xl sm:px-10">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Sign In to Your Account</h3>

          {quizLink && (
            <div className="mb-4 bg-indigo-950/20 border border-indigo-850 text-indigo-300 p-3 rounded-lg text-xs font-semibold">
              Please sign in to attempt this quiz.
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-950/20 border border-red-800 text-red-300 p-3 rounded-lg flex items-start gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase">
                Email / Username
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  name="username"
                  id="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="Enter your email or username"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase">
                Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Log In
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-500">
              New student?{' '}
              <Link 
                to={quizLink ? `/student/register?quizLink=${quizLink}` : "/student/register"} 
                className="font-bold text-indigo-400 hover:text-indigo-300"
              >
                Register as Student
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
