// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';

const NAVY = '#0B2A59';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSending) return;

    setIsSending(true);
    setErrorMsg('');
    const result = await requestPasswordReset(email.trim());
    setIsSending(false);

    if (result.success) {
      setSent(true);
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
        {sent ? (
          // The same message shows whether or not the address has an
          // account — the API won't say, and neither should the UI.
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full
                            flex items-center justify-center text-2xl mx-auto mb-4">
              ✉️
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your inbox</h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              If <strong>{email.trim()}</strong> has a Prezence account, a reset link
              is on its way. The link works once and expires in a few days.
            </p>
            <p className="text-xs text-slate-400 font-medium mt-4">
              Nothing arrived? Check your spam folder, or try again in a few minutes.
            </p>
            <Link
              to="/login"
              className="press inline-block mt-6 text-white font-bold text-sm px-6 py-2.5
                         rounded-lg shadow-md"
              style={{ backgroundColor: NAVY }}
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800 mb-1 text-center">
              Forgot your password?
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-6 text-center">
              Enter your email and we'll send you a link to set a new one.
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
                  htmlFor="reset-email"
                  className="block text-sm font-bold text-slate-700 mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none
                             transition-all focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': NAVY }}
                  placeholder="you@university.edu"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="press w-full text-white font-bold py-3 px-4 rounded-lg
                           shadow-md disabled:opacity-70"
                style={{ backgroundColor: NAVY }}
              >
                {isSending ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-sm font-medium text-slate-500 mt-6 pt-5
                          border-t border-slate-100">
              Remembered it?{' '}
              <Link to="/login" className="font-bold hover:underline" style={{ color: NAVY }}>
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}