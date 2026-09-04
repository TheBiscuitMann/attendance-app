// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerFaculty } from '../api/auth';

const NAVY = '#0B2A59';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Catch the obvious problems here so the teacher gets an answer
    // instantly instead of waiting on a round trip.
    if (password !== confirm) {
      setErrorMsg("Those passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Use at least 8 characters for your password.');
      return;
    }

    setIsLoading(true);
    const result = await registerFaculty(fullName.trim(), email.trim(), password);

    if (result.success) {
      // The API returns tokens on signup, so they're already logged in.
      navigate('/', { replace: true });
    } else {
      setErrorMsg(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-10"
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
          Create your account
        </h2>
        <p className="text-sm text-slate-500 font-medium mb-6 text-center">
          For faculty of Metropolitan University.
        </p>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold mb-4
                          border border-red-100 text-center animate-slideDown">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label
              htmlFor="reg-name"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Full name
            </label>
            <input
              id="reg-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none
                         transition-all focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': NAVY }}
              placeholder="Mosaddeq Hossain"
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Email address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none
                         transition-all focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': NAVY }}
              placeholder="you@university.edu"
            />
            <p className="text-xs text-slate-400 font-medium mt-1.5">
              You'll sign in with this address.
            </p>
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none
                         transition-all focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': NAVY }}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="reg-confirm"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none
                         transition-all focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': NAVY }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="press w-full text-white font-bold py-3 px-4 rounded-lg shadow-md
                       mt-2 disabled:opacity-70"
            style={{ backgroundColor: NAVY }}
          >
            {isLoading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-500 mt-6 pt-5
                      border-t border-slate-100">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold hover:underline"
            style={{ color: NAVY }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}