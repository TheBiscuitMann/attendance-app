// src/pages/ResetPassword.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';
import PasswordInput from '../components/PasswordInput';

const NAVY = '#0B2A59';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Both come from the emailed link.
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  const linkIsMalformed = !uid || !token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setErrorMsg('');

    if (password !== confirm) {
      setErrorMsg("Those passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Use at least 8 characters.');
      return;
    }

    setIsSaving(true);
    const result = await confirmPasswordReset(uid, token, password);
    setIsSaving(false);

    if (result.success) {
      setDone(true);
      // Give them a moment to read the confirmation before moving on.
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } else {
      setErrorMsg(result.error);
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
        {linkIsMalformed ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Link not valid</h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              This reset link is incomplete. It may have been cut in half by your
              email app — try copying the whole address, or request a new link.
            </p>
            <Link
              to="/forgot-password"
              className="press inline-block mt-6 text-white font-bold text-sm px-6 py-2.5
                         rounded-lg shadow-md"
              style={{ backgroundColor: NAVY }}
            >
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full
                            flex items-center justify-center text-2xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Password reset</h2>
            <p className="text-sm text-slate-600 font-medium">
              Taking you to the login page…
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800 mb-1 text-center">
              Set a new password
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-6 text-center">
              Choose something you'll remember.
            </p>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-semibold
                              mb-4 border border-red-100 text-center animate-slideDown">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  New password
                </label>
                <PasswordInput
              id="new-password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
              </div>

              <div>
                <label
                  htmlFor="confirm-new-password"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  Confirm new password
                </label>
                <PasswordInput
              id="confirm-new-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="press w-full text-white font-bold py-3 px-4 rounded-lg
                           shadow-md disabled:opacity-70"
                style={{ backgroundColor: NAVY }}
              >
                {isSaving ? 'Saving…' : 'Reset password'}
              </button>
            </form>

            <p className="text-center text-sm font-medium text-slate-500 mt-6 pt-5
                          border-t border-slate-100">
              <Link to="/login" className="font-bold hover:underline" style={{ color: NAVY }}>
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}