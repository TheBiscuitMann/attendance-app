// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginFaculty } from '../api/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    setIsLoading(true);
    setErrorMsg('');

    // Call the API function we just created
    const result = await loginFaculty(username, password);

    if (result.success) {
      // If Django says yes, redirect to the Dashboard
      navigate('/');
    } else {
      // If Django says no, show the error
      setErrorMsg(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      
      {/* MU Branding */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-[#1e3a8a] tracking-tight">Prezence</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Metropolitan University</p>
      </div>

      {/* Login Card */}
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-100 border-t-4 border-t-[#1e3a8a]">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Faculty Portal Login</h2>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4 border border-red-100 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username or Email</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all"
              placeholder="Enter your ID"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md mt-4 disabled:opacity-70"
          >
            {isLoading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}