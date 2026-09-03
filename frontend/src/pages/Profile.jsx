import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Lock, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  FileText, 
  HelpCircle, 
  Users
} from 'lucide-react';

const Profile = () => {
  const { user, token, logout } = useAuth();

  // Profile Edit states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || user?.username || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.email || user.username) setEmail(user.email || user.username);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const payload = user?.role === 'STUDENT'
        ? { name: name.trim(), email: email.trim() }
        : { username: email.trim(), email: email.trim(), name: name.trim() };

      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile.');

      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassLoading(true);
    setPassError('');
    setPassSuccess('');

    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to change password.');

      setPassSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 4000);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/40 border border-red-800 text-red-400 rounded-full text-xs font-bold uppercase">
            <ShieldCheck className="h-3.5 w-3.5" /> System Administrator
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950/40 border border-indigo-800 text-indigo-400 rounded-full text-xs font-bold uppercase">
            <User className="h-3.5 w-3.5" /> Educator Account
          </span>
        );
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-800 text-emerald-400 rounded-full text-xs font-bold uppercase">
            <User className="h-3.5 w-3.5" /> Student Profile
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 min-h-screen">
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          My Profile <User className="h-7 w-7 text-indigo-400" />
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your account credentials, view role statistics, and update your security settings.
        </p>
      </div>

      {/* TOP OVERVIEW CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-2xl text-indigo-400 shrink-0">
            {(user?.name || user?.username || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{user?.name || user?.username}</h2>
              {getRoleBadge(user?.role)}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-500" /> {user?.email || user?.username}
            </p>
            {user?.createdAt && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-600" /> Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* SUMMARY STATS BASED ON ROLE */}
        <div className="flex flex-wrap gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
          {user?.role === 'STUDENT' && (
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl min-w-[140px]">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Quizzes Attempted
              </p>
              <p className="text-xl font-bold text-white mt-1">{user?.stats?.attemptsCount || 0}</p>
            </div>
          )}

          {user?.role === 'TEACHER' && (
            <>
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl min-w-[140px]">
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" /> Documents
                </p>
                <p className="text-xl font-bold text-white mt-1">{user?.stats?.docsCount || 0}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl min-w-[140px]">
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Quizzes Created
                </p>
                <p className="text-xl font-bold text-white mt-1">{user?.stats?.quizzesCount || 0}</p>
              </div>
            </>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl min-w-[140px]">
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-indigo-400" /> Educators
                </p>
                <p className="text-xl font-bold text-white mt-1">{user?.stats?.teachersCount || 0}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl min-w-[140px]">
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Total Quizzes
                </p>
                <p className="text-xl font-bold text-white mt-1">{user?.stats?.quizzesCount || 0}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* EDIT FORMS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* EDIT PROFILE DETAILS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm h-fit">
          <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <User className="h-5 w-5 text-indigo-400" /> Edit Profile Information
          </h3>

          {profileSuccess && (
            <div className="bg-emerald-950/20 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="bg-red-950/20 border border-red-800 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {user?.role === 'STUDENT' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="Your full name"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Email / Username</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                placeholder="Your email or username"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              {profileLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm h-fit">
          <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock className="h-5 w-5 text-indigo-400" /> Security & Password
          </h3>

          {passSuccess && (
            <div className="bg-emerald-950/20 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="bg-red-950/20 border border-red-800 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Current Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase">New Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-xs text-indigo-400 font-semibold flex items-center gap-1 hover:text-indigo-300"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Show Password
              </button>

              <button
                type="submit"
                disabled={passLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                {passLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Change Password
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;
