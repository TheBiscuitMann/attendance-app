
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function SmartSync() {
  const navigate = useNavigate();
  const [initials, setInitials] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedClasses, setExtractedClasses] = useState([]);
  const [syncComplete, setSyncComplete] = useState(false);

  // This time map matches the columns of your specific MU routine!
  const timeColumnMap = {
    4: '09:00 AM - 10:30 AM',
    7: '10:30 AM - 12:00 PM',
    10: '12:00 PM - 01:30 PM',
    13: '01:30 PM - 03:00 PM',
    16: '03:00 PM - 04:30 PM',
    19: '04:30 PM - 06:00 PM'
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !initials) {
      alert("Please enter your initials and select an Excel file.");
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      // 1. Read the Excel File
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 2. Convert to a 2D Array (Rows and Columns)
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const mySchedule = {};
      let currentDay = "Unknown Day";

      // 3. The Extraction Engine (Scanning the massive grid)
      data.forEach((row, rowIndex) => {
        // If the first column has text (like "SUNDAY"), remember it!
        if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
          currentDay = row[0].trim().substring(0, 3); // Gets 'Sun', 'Mon', etc.
        }

        const batchName = row[1] || "Unknown Batch";

        // Loop through every single cell in this row
        for (let col = 2; col < row.length; col++) {
          const cellValue = row[col];
          
          // If this cell matches the Professor's Initials (e.g., "FAR")
          if (cellValue === initials.toUpperCase()) {
            
            // Because of the MU format, we know Course is 2 cells left, Room is 1 cell left
            const courseCode = row[col - 2];
            const roomNum = row[col - 1];
            const timeSlot = timeColumnMap[col] || "Unknown Time";

            // Generate a unique ID for this class block
            const classId = `${currentDay}-${timeSlot}-${courseCode}`;

            // Save it to our mapped schedule
            mySchedule[classId] = {
              title: `${courseCode} (${batchName})`,
              room: roomNum,
              time: timeSlot.split('-')[0].trim(), // Just take the start time
              days: [currentDay]
            };
          }
        }
      });

      // 4. Save to Browser Memory (Connecting it to your Profile Dropdown!)
      localStorage.setItem('mu_profile_schedules', JSON.stringify(mySchedule));
      
      // Tell the rest of the app the schedule updated
      window.dispatchEvent(new Event('profileScheduleUpdated'));

      setExtractedClasses(Object.values(mySchedule));
      setIsProcessing(false);
      setSyncComplete(true);
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