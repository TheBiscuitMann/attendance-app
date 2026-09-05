import { Link } from 'react-router-dom';

/**
 * Placeholder shown in place of the real Smart Sync page while the PDF
 * import path is being finished.
 *
 * SmartSync.jsx is untouched and still in the repo — this component simply
 * takes its place on the route. To put Smart Sync back, see the two lines
 * marked SMART SYNC in the router file.
 */
export default function SmartSyncComingSoon() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Smart Sync</h1>

      <div className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
          In development
        </span>

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          We're still building this
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Smart Sync will read the university's master class routine and fill in
          your weekly schedule automatically. It isn't ready yet, so we've kept
          it switched off rather than let it put wrong classes on your schedule.
        </p>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          In the meantime you can set your week up by hand on the Schedule page —
          anything you enter there will be kept when Smart Sync arrives.
        </p>

        <Link
          to="/schedule"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Go to Schedule
        </Link>
      </div>
    </div>
  );
}