// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { fetchProfile, updateFullName, changePassword } from '../api/profile';
import PasswordInput from '../components/PasswordInput';

const NAVY = '#0B2A59';

export default function Profile() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [nameStatus, setNameStatus] = useState(null); // { type, text }
  const [isSavingName, setIsSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    fetchProfile().then((result) => {
      if (result.success) {
        setEmail(result.data.email);
        setFullName(result.data.full_name || '');
        setSavedName(result.data.full_name || '');
      }
      setIsLoading(false);
    });
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (isSavingName) return;

    setIsSavingName(true);
    setNameStatus(null);
    const result = await updateFullName(fullName.trim());
    setIsSavingName(false);

    if (result.success) {
      setSavedName(fullName.trim());
      setNameStatus({ type: 'success', text: 'Your name has been updated.' });
      setTimeout(() => setNameStatus(null), 3200);
    } else {
      setNameStatus({ type: 'error', text: result.error });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (isSavingPassword) return;

    setPasswordStatus(null);

    // Catch the obvious problems before spending a round trip on them.
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: "Those passwords don't match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({
        type: 'error',
        text: 'Use at least 8 characters for your new password.',
      });
      return;
    }

    setIsSavingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsSavingPassword(false);

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({ type: 'success', text: 'Your password has been changed.' });
      setTimeout(() => setPasswordStatus(null), 3200);
    } else {
      setPasswordStatus({ type: 'error', text: result.error });
    }
  };

  const StatusLine = ({ status }) =>
    status ? (
      <div
        className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold animate-slideDown ${
          status.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}
      >
        {status.type === 'success' && '✅ '}
        {status.text}
      </div>
    ) : null;

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none ' +
    'transition-shadow focus:ring-2 focus:border-transparent text-slate-800 font-medium';

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto page-enter">
        <div className="h-8 w-56 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="h-52 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 page-enter">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Profile Settings
        </h1>
        <p className="text-slate-500 mt-1 font-medium">
          Manage your account details and password.
        </p>
      </div>

      {/* ── Account details ────────────────────────────────────── */}
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
        style={{ borderTop: `4px solid ${NAVY}` }}
      >
        <h2 className="text-lg font-bold text-slate-800 mb-1">Account details</h2>
        <p className="text-sm text-slate-500 font-medium mb-5">
          Your name appears across the portal and on exported records.
        </p>

        <StatusLine status={nameStatus} />

        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Email address
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              disabled
              readOnly
              className={`${inputClass} bg-slate-100 text-slate-500 cursor-not-allowed`}
            />
            <p className="text-xs text-slate-400 font-medium mt-1.5">
              You sign in with this address, so it can't be changed here.
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              style={{ '--tw-ring-color': NAVY }}
              placeholder="Arif Rahman"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingName || fullName.trim() === savedName || !fullName.trim()}
            className="press text-white font-bold text-sm px-6 py-2.5 rounded-lg
                       shadow-md disabled:opacity-50 disabled:shadow-none"
            style={{ backgroundColor: NAVY }}
          >
            {isSavingName ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* ── Password ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Change password</h2>
        <p className="text-sm text-slate-500 font-medium mb-5">
          You'll need your current password to set a new one.
        </p>

        <StatusLine status={passwordStatus} />

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-bold text-slate-700 mb-1.5"
            >
              Current password
            </label>
            <PasswordInput
                id="current-password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                style={{ '--tw-ring-color': NAVY }}
              />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                style={{ '--tw-ring-color': NAVY }}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-bold text-slate-700 mb-1.5"
              >
                Confirm new password
              </label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                style={{ '--tw-ring-color': NAVY }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingPassword}
            className="press text-white font-bold text-sm px-6 py-2.5 rounded-lg
                       shadow-md disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {isSavingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}