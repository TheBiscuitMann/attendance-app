// src/components/PasswordInput.jsx
//
// The standard auth password field, with an eye toggle to reveal what
// was typed. Used on Login, Register and Reset Password so the
// behavior and styling stay identical everywhere.
import { useState } from 'react';

const EyeIcon = ({ crossed }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    {crossed && <path d="M4 4l16 16" />}
  </svg>
);

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  required = true,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={isVisible ? 'text' : 'password'}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 outline-none
                   transition-all focus:ring-2 focus:border-transparent"
      />
      <button
        type="button"
        onClick={() => setIsVisible((v) => !v)}
        className="absolute right-0 inset-y-0 px-3.5 flex items-center text-slate-400
                   hover:text-slate-600 transition-colors"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
      >
        <EyeIcon crossed={isVisible} />
      </button>
    </div>
  );
}