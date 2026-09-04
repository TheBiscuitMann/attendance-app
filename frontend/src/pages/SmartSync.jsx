import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { emptyWeek, saveWeek, DAYS } from '../utils/schedule';

export default function SmartSync() {
  const navigate = useNavigate();
  const [initials, setInitials] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedClasses, setExtractedClasses] = useState([]);
  const [syncComplete, setSyncComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Column positions in the MU master routine, mapped to 24-hour
  // start/end times — the format the schedule stores.
  const timeColumnMap = {
    4:  { start: '09:00', end: '10:30' },
    7:  { start: '10:30', end: '12:00' },
    10: { start: '12:00', end: '13:30' },
    13: { start: '13:30', end: '15:00' },
    16: { start: '15:00', end: '16:30' },
    19: { start: '16:30', end: '18:00' },
  };

  const DAY_KEYS = DAYS.map((d) => d.key);

  // The sheet writes days as "SUNDAY"; the schedule keys them as "Sun".
  const normaliseDay = (raw) => {
    const three = raw.trim().slice(0, 3).toLowerCase();
    return three.charAt(0).toUpperCase() + three.slice(1);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !initials) {
      setErrorMsg('Enter your initials and choose an Excel file first.');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      // 1. Read the Excel File
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 2. Convert to a 2D Array (Rows and Columns)
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const week = emptyWeek();
      let extracted = 0;
      let currentDay = null;

      // 3. The Extraction Engine (Scanning the massive grid)
      data.forEach((row, rowIndex) => {
        // If the first column has text (like "SUNDAY"), remember it!
        if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
          const candidate = normaliseDay(row[0]);
          if (DAY_KEYS.includes(candidate)) currentDay = candidate;
        }

        const batchName = row[1] || "Unknown Batch";

        // Loop through every single cell in this row
        for (let col = 2; col < row.length; col++) {
          const cellValue = row[col];
          
          // If this cell matches the Professor's Initials (e.g., "FAR")
          if (currentDay && cellValue === initials.toUpperCase()) {

            // In the MU layout the course code sits two cells left of
            // the initials, and the room one cell left.
            const courseCode = row[col - 2];
            const roomNum = row[col - 1];
            const slot = timeColumnMap[col] || { start: '', end: '' };

            week[currentDay].push({
              // Routine entries are free text — they aren't tied to a
              // course the teacher created in the app.
              courseId: 'custom',
              customTitle: `${courseCode} (${batchName})`,
              room: roomNum ? String(roomNum) : '',
              start: slot.start,
              end: slot.end,
            });
            extracted += 1;
          }
        }
      });

      // 4. Save to the server — this replaces the whole weekly
      //    schedule, and saveWeek notifies the rest of the app.
      const result = await saveWeek(week);
      setIsProcessing(false);

      if (result.success) {
        setExtractedClasses(new Array(extracted));
        setSyncComplete(true);
      } else {
        setErrorMsg(result.error);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      
      <div className="text-center mb-10">
        <div className="bg-[#0B2A59] text-white w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-900/20">
          ⚡
        </div>
        <h1 className="text-4xl font-black text-[#0B2A59] tracking-tight mb-2">Smart Routine Sync</h1>
        <p className="text-slate-500 font-medium text-lg">Upload the master varsity routine. We'll do the rest.</p>
      </div>

      {!syncComplete ? (
        <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 max-w-2xl mx-auto relative overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute top-0 left-0 w-full h-2 bg-[#D32F2F]"></div>

          {errorMsg && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">{errorMsg}</p>
            </div>
          )}

          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3
                        text-sm font-semibold text-amber-800">
            ⚠️ Syncing replaces your entire weekly schedule with what's found in the routine.
          </p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div>
              <label className="block text-sm font-bold text-[#0B2A59] uppercase tracking-wider mb-2">
                Step 1: Your Academic Initials
              </label>
              <input 
                type="text" 
                placeholder="e.g., FAR, AWS, MDP" 
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-[#0B2A59] outline-none text-xl font-black text-slate-800 uppercase transition-colors"
              />
              <p className="text-xs text-slate-400 mt-2 font-medium">This must exactly match how you appear on the routine.</p>
            </div>

            {/* Step 2 */}
            <div>
              <label className="block text-sm font-bold text-[#0B2A59] uppercase tracking-wider mb-2">
                Step 2: Upload Master Routine (.xlsx)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-[#0B2A59] transition-all cursor-pointer relative group">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  disabled={!initials || isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📄</div>
                <p className="font-bold text-slate-700">Drag & Drop Excel File Here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse your computer</p>
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="mt-8 text-center animate-pulse">
              <p className="text-[#D32F2F] font-black text-lg">Scraping thousands of rows...</p>
            </div>
          )}
        </div>
      ) : (
        /* Success Screen */
        <div className="bg-emerald-50 rounded-3xl p-10 shadow-lg border border-emerald-100 max-w-2xl mx-auto text-center animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-md shadow-emerald-500/30">
            ✓
          </div>
          <h2 className="text-3xl font-black text-emerald-900 mb-2">Sync Successful!</h2>
          <p className="text-emerald-700 font-medium mb-8">
            We extracted <span className="font-black bg-emerald-200 px-2 py-0.5 rounded">{extractedClasses.length}</span> classes assigned to {initials.toUpperCase()}.
          </p>

          <button 
            onClick={() => navigate('/')}
            className="bg-[#0B2A59] hover:bg-[#081e40] text-white font-bold py-4 px-10 rounded-xl shadow-md transition-all text-lg w-full"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}