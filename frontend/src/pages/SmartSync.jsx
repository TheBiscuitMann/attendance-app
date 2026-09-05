import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  emptyWeek, saveWeek, importRoutinePdf, DAYS, formatTime,
} from '../utils/schedule';

const NAVY = '#0B2A59';

export default function SmartSync() {
  const navigate = useNavigate();
  const [initials, setInitials] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState(null); // { classes, source }
  const [syncedCount, setSyncedCount] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Column positions in the MU master routine spreadsheet, mapped to
  // 24-hour start/end times.
  const timeColumnMap = {
    4:  { start: '09:00', end: '10:30' },
    7:  { start: '10:30', end: '12:00' },
    10: { start: '12:00', end: '13:30' },
    13: { start: '13:30', end: '15:00' },
    16: { start: '15:00', end: '16:30' },
    19: { start: '16:30', end: '18:00' },
  };

  const DAY_KEYS = DAYS.map((d) => d.key);
  const DAY_LABEL = Object.fromEntries(DAYS.map((d) => [d.key, d.label]));

  // The sheet writes days as "SUNDAY"; the schedule keys them as "Sun".
  const normaliseDay = (raw) => {
    const three = raw.trim().slice(0, 3).toLowerCase();
    return three.charAt(0).toUpperCase() + three.slice(1);
  };

  /* ── Spreadsheet path (parsed here in the browser) ──────────────── */

  const extractFromSheet = (binaryString) => {
    const workbook = XLSX.read(binaryString, { type: 'binary' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const found = [];
    let currentDay = null;

    data.forEach((row) => {
      if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
        const candidate = normaliseDay(row[0]);
        if (DAY_KEYS.includes(candidate)) currentDay = candidate;
      }

      const batchName = row[1] || 'Unknown Batch';

      for (let col = 2; col < row.length; col++) {
        if (currentDay && row[col] === initials.toUpperCase()) {
          // In the MU layout the course code sits two cells left of the
          // initials, and the room one cell left.
          const slot = timeColumnMap[col] || { start: '', end: '' };
          found.push({
            day: currentDay,
            course: row[col - 2] ? String(row[col - 2]) : '',
            batch: String(batchName),
            room: row[col - 1] ? String(row[col - 1]) : '',
            start: slot.start,
            end: slot.end,
          });
        }
      }
    });

    return found;
  };

  /* ── Upload ─────────────────────────────────────────────────────── */

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked
    if (!file) return;
    if (!initials.trim()) {
      setErrorMsg('Enter your initials first.');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);

    const name = file.name.toLowerCase();

    if (name.endsWith('.pdf')) {
      // Grid reconstruction happens on the server.
      importRoutinePdf(file, initials.trim().toUpperCase()).then((result) => {
        setIsProcessing(false);
        if (result.success) {
          setPreview({ classes: result.data.classes, source: 'pdf' });
        } else {
          setErrorMsg(result.error);
        }
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setIsProcessing(false);
      try {
        setPreview({ classes: extractFromSheet(event.target.result), source: 'sheet' });
      } catch {
        setErrorMsg('That spreadsheet could not be read. Re-save it as .xlsx and '
          + 'try again.');
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setErrorMsg('That file could not be opened.');
    };
    reader.readAsBinaryString(file);
  };

  /* ── Confirm and save ───────────────────────────────────────────── */

  const handleConfirm = async () => {
    if (!preview || isSaving) return;
    setIsSaving(true);

    const week = emptyWeek();
    preview.classes.forEach((item) => {
      if (!week[item.day]) return;
      week[item.day].push({
        // Routine entries are free text — they aren't tied to a course
        // the teacher created in the app.
        courseId: 'custom',
        customTitle: item.batch ? `${item.course} (${item.batch})` : item.course,
        room: item.room || '',
        start: item.start,
        end: item.end,
      });
    });

    const result = await saveWeek(week);
    setIsSaving(false);

    if (result.success) {
      setSyncedCount(preview.classes.length);
      setPreview(null);
    } else {
      setErrorMsg(result.error);
    }
  };

  /* ── Success screen ─────────────────────────────────────────────── */

  if (syncedCount !== null) {
    return (
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-2 sm:px-6">
        <div className="bg-emerald-50 rounded-3xl p-8 sm:p-10 shadow-lg border
                        border-emerald-100 max-w-2xl mx-auto text-center animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex
                          items-center justify-center text-4xl mx-auto mb-6
                          shadow-md shadow-emerald-500/30">
            ✓
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-900 mb-2">
            Sync Successful
          </h2>
          <p className="text-emerald-700 font-medium mb-8">
            {syncedCount} class{syncedCount === 1 ? '' : 'es'} assigned to{' '}
            {initials.toUpperCase()} are now on your schedule.
          </p>
          <button
            onClick={() => navigate('/')}
            className="press bg-[#0B2A59] hover:bg-[#081e40] text-white font-bold py-4
                       px-10 rounded-xl shadow-md transition-all text-lg w-full"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ── Preview screen ─────────────────────────────────────────────── */

  if (preview) {
    const byDay = DAYS
      .map((d) => ({ ...d, items: preview.classes.filter((c) => c.day === d.key) }))
      .filter((d) => d.items.length > 0);

    return (
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-2 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border
                        border-slate-100 max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-black text-[#0B2A59] mb-1">
            Check before syncing
          </h2>
          <p className="text-slate-500 font-medium text-sm mb-5">
            {preview.classes.length} class{preview.classes.length === 1 ? '' : 'es'}{' '}
            found for <strong>{initials.toUpperCase()}</strong>. Nothing has been saved
            yet.
          </p>

          {preview.classes.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-bold text-amber-900">
                No classes matched those initials.
              </p>
              <p className="text-sm text-amber-800 font-medium mt-1">
                Check that <strong>{initials.toUpperCase()}</strong> is exactly how you
                appear on the routine, then try again.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3
                            text-sm font-semibold text-amber-800">
                ⚠️ Syncing <strong>replaces your entire weekly schedule</strong> with
                the classes below.
              </p>
              <div className="max-h-[45vh] overflow-y-auto thin-scroll -mx-1 px-1">
                {byDay.map((day) => (
                  <div key={day.key} className="mb-4">
                    <p className="text-xs font-black text-slate-400 uppercase
                                  tracking-wider mb-1.5">
                      {DAY_LABEL[day.key]}
                    </p>
                    {day.items.map((item, index) => (
                      <div
                        key={`${day.key}-${index}`}
                        className="flex items-baseline justify-between gap-3 py-2
                                   border-b border-slate-100"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">
                            {item.course || 'Untitled class'}
                            {item.batch && (
                              <span className="text-slate-500 font-medium">
                                {' '}({item.batch})
                              </span>
                            )}
                          </p>
                          {item.room && (
                            <p className="text-xs text-slate-400 font-medium">
                              Room {item.room}
                            </p>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          {item.start
                            ? `${formatTime(item.start)} – ${formatTime(item.end)}`
                            : 'No time'}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-5">
            <button
              onClick={() => setPreview(null)}
              disabled={isSaving}
              className="press font-bold text-sm px-5 py-3 rounded-xl text-slate-600
                         hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving || preview.classes.length === 0}
              className="press text-white font-bold text-sm px-6 py-3 rounded-xl
                         shadow-md uppercase tracking-wide disabled:opacity-60"
              style={{ backgroundColor: NAVY }}
            >
              {isSaving ? 'Syncing…' : `Sync ${preview.classes.length} classes`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Upload screen ──────────────────────────────────────────────── */

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-2 sm:px-6">
      <div className="text-center mb-8 sm:mb-10">
        <div className="bg-[#0B2A59] text-white w-16 h-16 rounded-2xl flex items-center
                        justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-900/20">
          ⚡
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#0B2A59] tracking-tight mb-2">
          Smart Routine Sync
        </h1>
        <p className="text-slate-500 font-medium text-base sm:text-lg">
          Upload the master varsity routine. We'll do the rest.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100
                      max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#D32F2F]" />

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">{errorMsg}</p>
          </div>
        )}

        <div className="space-y-8">
          <div>
            <label
              htmlFor="sync-initials"
              className="block text-sm font-bold text-[#0B2A59] uppercase tracking-wider mb-2"
            >
              Step 1: Your Academic Initials
            </label>
            <input
              id="sync-initials"
              type="text"
              placeholder="e.g., FAR, AWS, MDP"
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border-2 border-slate-200
                         focus:border-[#0B2A59] outline-none text-xl font-black
                         text-slate-800 uppercase transition-colors"
            />
            <p className="text-xs text-slate-400 mt-2 font-medium">
              This must exactly match how you appear on the routine.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#0B2A59] uppercase
                              tracking-wider mb-2">
              Step 2: Upload Master Routine
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 sm:p-8
                            text-center hover:bg-slate-50 hover:border-[#0B2A59]
                            transition-all cursor-pointer relative group">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileUpload}
                disabled={!initials.trim() || isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer
                           disabled:cursor-not-allowed"
                aria-label="Choose the routine file"
              />
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                📄
              </div>
              <p className="font-bold text-slate-700">Tap to choose the routine file</p>
              <p className="text-sm text-slate-400 mt-1">
                Excel (.xlsx, .csv) or PDF — you'll see what was found before anything
                is saved.
              </p>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mt-8 text-center animate-pulse">
            <p className="text-[#D32F2F] font-black text-lg">Reading the routine…</p>
          </div>
        )}
      </div>
    </div>
  );
}