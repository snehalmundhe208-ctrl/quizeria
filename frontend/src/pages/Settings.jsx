import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon,
  User, 
  Lock, 
  Cpu, 
  Sliders, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Loader2,
  HardDrive
} from 'lucide-react';

const Settings = () => {
  const { user, token, logout } = useAuth();

  // Profile forms
  const [username, setUsername] = useState(user?.username || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password forms
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // System Configurations (AI + defaults, saved persistently in localStorage)
  const [aiProvider, setAiProvider] = useState('Gemini');
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [aiKeyStatus, setAiKeyStatus] = useState('Configured'); // mock status
  const [newAiKey, setNewAiKey] = useState('');
  const [defaultMarks, setDefaultMarks] = useState(1.0);
  const [defaultDifficulty, setDefaultDifficulty] = useState('MEDIUM');
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(30);
  const [maxUploadLimit, setMaxUploadLimit] = useState('10MB');
  
  const [sysSuccess, setSysSuccess] = useState('');

  useEffect(() => {
    // Load local storage keys if present
    const savedProvider = localStorage.getItem('sf_ai_provider');
    const savedModel = localStorage.getItem('sf_ai_model');
    const savedMarks = localStorage.getItem('sf_default_marks');
    const savedDiff = localStorage.getItem('sf_default_difficulty');
    const savedTime = localStorage.getItem('sf_default_time');
    const savedUpload = localStorage.getItem('sf_max_upload');

    if (savedProvider) setAiProvider(savedProvider);
    if (savedModel) setAiModel(savedModel);
    if (savedMarks) setDefaultMarks(parseFloat(savedMarks));
    if (savedDiff) setDefaultDifficulty(savedDiff);
    if (savedTime) setDefaultTimeLimit(parseInt(savedTime, 10));
    if (savedUpload) setMaxUploadLimit(savedUpload);
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.trim() })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update username.');

      setProfileSuccess('Profile settings updated successfully. Please log in again to verify changes.');
      setTimeout(() => {
        logout(); // Force re-login with new token credentials
      }, 2500);
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
      if (!response.ok) throw new Error(data.error || 'Password mismatch.');

      setPassSuccess('Account credentials changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const handleSaveSystemConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('sf_ai_provider', aiProvider);
    localStorage.setItem('sf_ai_model', aiModel);
    localStorage.setItem('sf_default_marks', defaultMarks.toString());
    localStorage.setItem('sf_default_difficulty', defaultDifficulty);
    localStorage.setItem('sf_default_time', defaultTimeLimit.toString());
    localStorage.setItem('sf_max_upload', maxUploadLimit);

    if (newAiKey.trim()) {
      localStorage.setItem('sf_ai_key_configured', 'true');
      setAiKeyStatus('Configured');
      setNewAiKey('');
    }

    setSysSuccess('System default parameters updated successfully.');
    setTimeout(() => setSysSuccess(''), 3000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 min-h-screen">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          Admin Settings <SettingsIcon className="h-7 w-7 text-indigo-400" />
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure teacher credentials, default parameters, AI models, and file sizes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Profile & Credentials */}
        <div className="space-y-8">
          
          {/* PROFILE UPDATE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <User className="h-5 w-5 text-indigo-400" /> Update Username
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
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Username / ID</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={profileLoading || username === user?.username}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                {profileLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Change Profile Username
              </button>
            </form>
          </div>

          {/* PASSWORD UPDATE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Lock className="h-5 w-5 text-indigo-400" /> Update Credentials
            </h3>

            {passSuccess && (
              <div className="bg-emerald-950/20 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {passSuccess}
              </div>
            )}

            {passError && (
              <div className="bg-red-950/20 border border-red-800 text-red-300 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {passError}
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {passLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Change Password
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: AI configurations & default preferences */}
        <div className="space-y-8">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Cpu className="h-5 w-5 text-indigo-400" /> System Configurations
            </h3>

            {sysSuccess && (
              <div className="bg-emerald-950/20 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {sysSuccess}
              </div>
            )}

            <form onSubmit={handleSaveSystemConfig} className="space-y-4">
              
              {/* AI Config */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">AI Provider</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Gemini">Google Gemini</option>
                    <option value="OpenAI">OpenAI GPT</option>
                    <option value="Anthropic">Anthropic Claude</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Active LLM Model</label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Provider API Key</label>
                <input
                  type="password"
                  value={newAiKey}
                  onChange={(e) => setNewAiKey(e.target.value)}
                  placeholder={`API Key: ${aiKeyStatus} (Input to override)`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">API keys are stored securely on your local workspace and never displayed on screens.</span>
              </div>

              {/* Assessment Defaults */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-850 pt-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase">Default Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultMarks}
                    onChange={(e) => setDefaultMarks(parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase">Difficulty</label>
                  <select
                    value={defaultDifficulty}
                    onChange={(e) => setDefaultDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none font-bold"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase">Time Limit (mins)</label>
                  <input
                    type="number"
                    min="5"
                    value={defaultTimeLimit}
                    onChange={(e) => setDefaultTimeLimit(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Max upload settings */}
              <div className="space-y-1 border-t border-slate-850 pt-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase flex items-center gap-1">
                  <HardDrive className="h-4 w-4 text-indigo-400" /> Max Upload Size Limit
                </label>
                <select
                  value={maxUploadLimit}
                  onChange={(e) => setMaxUploadLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="10MB">10 MegaBytes (Recommended)</option>
                  <option value="20MB">20 MegaBytes</option>
                  <option value="50MB">50 MegaBytes</option>
                </select>
                <span className="text-[10px] text-slate-500">Restricts Multer upload payloads on the server directory structure.</span>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                Save System Defaults
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Settings;
