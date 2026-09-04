// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { loginFaculty } from '../api/auth';

const NAVY = '#0B2A59';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // The API client redirects here with ?expired=1 when a token has run
  // out, so the teacher knows why they were signed out.
  const sessionExpired = searchParams.get('expired') === '1';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const result = await loginFaculty(username.trim(), password);

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setErrorMsg(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >

      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-tight" style={{ color: NAVY }}>
          Prezence
        </h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
          Metropolitan University
        </p>
      </div>

      <div
        className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-100"
        style={{ borderTop: `4px solid ${NAVY}` }}
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-1 text-center">
          Faculty Portal Login
        </h2>
        <p className="text-sm text-slate-500 font-medium mb-6 text-center">
          Sign in to manage your courses and attendance.
        </p>

        {sessionExpired && !errorMsg && (
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm font-semibold
                          mb-4 border border-amber-200 text-center">
            Your session expired. Please log in again.
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold mb-4
                          border border-red-100 text-center animate-slideDown">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none
                         transition-all focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': NAVY }}
              placeholder="you@university.edu"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none
                         transition-all focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': NAVY }}
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end -mt-2">
            <Link
              to="/forgot-password"
              className="text-xs font-bold hover:underline"
              style={{ color: NAVY }}
            >
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="press w-full text-white font-bold py-3 px-4 rounded-lg shadow-md
                       mt-2 disabled:opacity-70"
            style={{ backgroundColor: NAVY }}
          >
            {isLoading ? 'Authenticating…' : 'Secure Login'}
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-500 mt-6 pt-5
                      border-t border-slate-100">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-bold hover:underline"
            style={{ color: NAVY }}
          >
            Sign Up!
          </Link>
        </p>
      </div>
    </div>
  );
}