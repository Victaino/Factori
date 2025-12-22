
import React, { useState, useEffect, useMemo } from 'react';
import { db, ATTENDANCE_SQL, EMPLOYEE_FIELDS_SQL } from '../services/db';
import { Attendance, Employee } from '../types';
import { Clock, Search, Calendar, User, Fingerprint, LogIn, LogOut, X, AlertTriangle, Terminal, Copy, ScanFace, CheckCircle, Lock } from 'lucide-react';

export const AttendanceManager: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mode, setMode] = useState<'ADMIN' | 'KIOSK'>('ADMIN');
  const [dbError, setDbError] = useState<{message: string, sql?: string} | null>(null);

  // Kiosk State
  const [kioskEmpId, setKioskEmpId] = useState<string>('');
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [kioskMessage, setKioskMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Enrollment State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollEmployee, setEnrollEmployee] = useState<Employee | null>(null);
  const [enrollStage, setEnrollStage] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');

  // Filter State (Admin)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const [att, emp] = await Promise.all([
            db.getAttendance(),
            db.getEmployees()
        ]);
        setAttendance(att);
        setEmployees(emp);
    } catch (err: any) {
        if (err.message.includes('relation "attendance" does not exist') || err.message.includes('404')) {
            setDbError({
                message: "The Attendance table is missing from your database.",
                sql: ATTENDANCE_SQL
            });
        }
        else if (err.message.includes('isBiometricRegistered')) {
             setDbError({
                message: "Employee table needs update for biometric registration.",
                sql: EMPLOYEE_FIELDS_SQL
            });
        }
    }
  };

  // --- Enrollment Logic ---
  
  const handleEnrollClick = (emp: Employee) => {
      setEnrollEmployee(emp);
      setEnrollStage('IDLE');
      setEnrollModalOpen(true);
  };

  const simulateEnrollScan = async () => {
      if(!enrollEmployee) return;
      setEnrollStage('SCANNING');
      
      // Simulate hardware delay
      setTimeout(async () => {
          try {
              await db.updateEmployee(enrollEmployee.id, { isBiometricRegistered: true });
              setEmployees(prev => prev.map(e => e.id === enrollEmployee.id ? { ...e, isBiometricRegistered: true } : e));
              setEnrollStage('SUCCESS');
              setTimeout(() => {
                  setEnrollModalOpen(false);
                  setEnrollEmployee(null);
              }, 1500);
          } catch (e) {
              setEnrollStage('ERROR');
          }
      }, 2000);
  };

  // --- Kiosk Logic ---

  const handleKioskScan = async () => {
      if (!kioskEmpId) return;
      
      const emp = employees.find(e => e.id === kioskEmpId);
      if (!emp) return;

      // Check Registration
      if (!emp.isBiometricRegistered) {
          setKioskMessage({ type: 'error', text: 'Fingerprint not registered. Please ask Admin to enroll you.' });
          setTimeout(() => setKioskMessage(null), 4000);
          return;
      }

      setBiometricScanning(true);
      setKioskMessage(null);

      // Simulate Scanning Delay
      setTimeout(async () => {
          try {
              // Logic: Check if clocked in today. If not -> Clock In. If yes -> Clock Out.
              const today = new Date().toISOString().split('T')[0];
              const record = attendance.find(a => a.employeeId === kioskEmpId && a.date === today);

              if (!record) {
                  await db.clockIn(kioskEmpId, 'Biometric');
                  setKioskMessage({ type: 'success', text: 'Clocked In Successfully' });
              } else if (!record.timeOut) {
                  await db.clockOut(kioskEmpId);
                  setKioskMessage({ type: 'success', text: 'Clocked Out Successfully' });
              } else {
                  setKioskMessage({ type: 'error', text: 'Already completed shift for today.' });
              }
              
              fetchData(); // Refresh data
          } catch (e: any) {
              setKioskMessage({ type: 'error', text: e.message || 'Scan failed' });
          } finally {
              setBiometricScanning(false);
              // Auto clear selection after success
              setTimeout(() => {
                  if(!kioskMessage?.text.includes('error')) setKioskEmpId('');
                  setKioskMessage(null);
              }, 3000);
          }
      }, 1500);
  };

  // --- Admin Logic ---

  const getAttendanceStatus = (empId: string) => {
      const record = attendance.find(a => a.employeeId === empId && a.date === filterDate);
      if (!record) return 'Absent';
      if (record.timeIn && !record.timeOut) return 'Present';
      return 'Completed';
  };

  const getRecord = (empId: string) => attendance.find(a => a.employeeId === empId && a.date === filterDate);

  const filteredEmployees = useMemo(() => {
      return employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [employees, searchTerm]);

  // --- Render ---

  if (mode === 'KIOSK') {
      return (
          <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
                  <button 
                    onClick={() => setMode('ADMIN')} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X size={24} />
                  </button>

                  <div className="p-8 text-center border-b border-gray-100">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                          <Fingerprint size={32} />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">Time Clock</h2>
                      <p className="text-gray-500">Select your name and scan to punch in/out</p>
                  </div>

                  <div className="p-8 space-y-6">
                      {kioskMessage && (
                          <div className={`p-4 rounded-lg text-center font-medium ${kioskMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {kioskMessage.text}
                          </div>
                      )}

                      {!biometricScanning ? (
                          <div className="space-y-4">
                              <label className="block text-sm font-medium text-gray-700">Employee Name</label>
                              <select 
                                  className="w-full border rounded-xl p-4 text-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={kioskEmpId}
                                  onChange={(e) => setKioskEmpId(e.target.value)}
                              >
                                  <option value="">-- Select Identity --</option>
                                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                              </select>

                              <button 
                                  onClick={handleKioskScan}
                                  disabled={!kioskEmpId}
                                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                              >
                                  <Fingerprint size={24} /> 
                                  {kioskEmpId ? 'Tap to Scan Fingerprint' : 'Select Employee First'}
                              </button>
                          </div>
                      ) : (
                          <div className="py-8 flex flex-col items-center">
                              <div className="relative">
                                  <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                                  <Fingerprint size={64} className="text-blue-600 relative z-10" />
                              </div>
                              <p className="mt-4 text-lg font-medium text-gray-600 animate-pulse">Scanning...</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
                      Factori Secure Timekeeper v1.0
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-blue-600" /> Time & Attendance
        </h2>
        <button 
          onClick={() => setMode('KIOSK')}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 shadow-lg"
        >
          <Fingerprint size={20} /> Open Kiosk Mode
        </button>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                    <h3 className="font-bold text-red-800">Configuration Required</h3>
                    <p className="text-sm text-red-700 mt-1">{dbError.message}</p>
                    
                    {dbError.sql && (
                        <div className="mt-3 bg-gray-900 rounded-lg p-3 overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400 flex items-center gap-1"><Terminal size={12}/> SQL Fix</span>
                                <button 
                                onClick={() => navigator.clipboard.writeText(dbError.sql!)}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    <Copy size={12} /> Copy
                                </button>
                            </div>
                            <code className="text-xs font-mono text-green-400 block break-all">
                                {dbError.sql}
                            </code>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Admin View */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search employee..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
            type="date" 
            className="border rounded-lg pl-10 pr-3 py-2 bg-white outline-none focus:border-blue-500 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Employee</th>
              <th className="p-4 font-semibold text-gray-600">Biometric</th>
              <th className="p-4 font-semibold text-gray-600">Status (Today)</th>
              <th className="p-4 font-semibold text-gray-600">Clock In</th>
              <th className="p-4 font-semibold text-gray-600">Clock Out</th>
              <th className="p-4 font-semibold text-gray-600">Method</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredEmployees.map(emp => {
                const status = getAttendanceStatus(emp.id);
                const record = getRecord(emp.id);
                return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-800 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                <User size={14} />
                            </div>
                            {emp.name}
                        </td>
                        <td className="p-4">
                            {emp.isBiometricRegistered ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded w-fit">
                                    <CheckCircle size={12} /> Enrolled
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded w-fit">
                                    <Lock size={12} /> Not Set
                                </span>
                            )}
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                status === 'Absent' ? 'bg-gray-100 text-gray-500' :
                                status === 'Present' ? 'bg-green-100 text-green-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {status}
                            </span>
                        </td>
                        <td className="p-4 text-gray-600">{record?.timeIn || '--:--'}</td>
                        <td className="p-4 text-gray-600">{record?.timeOut || '--:--'}</td>
                        <td className="p-4 text-gray-500 text-xs">
                            {record?.method && (
                                <span className="flex items-center gap-1">
                                    {record.method === 'Biometric' ? <Fingerprint size={12}/> : <Clock size={12}/>}
                                    {record.method}
                                </span>
                            )}
                        </td>
                        <td className="p-4 text-right">
                            <button 
                                onClick={() => handleEnrollClick(emp)}
                                className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ml-auto transition-colors"
                            >
                                <ScanFace size={14} /> 
                                {emp.isBiometricRegistered ? 'Update Fingerprint' : 'Register Fingerprint'}
                            </button>
                        </td>
                    </tr>
                );
            })}
            {filteredEmployees.length === 0 && (
                <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">No employees found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Biometric Enrollment Modal */}
      {enrollModalOpen && enrollEmployee && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden relative">
                  <button 
                    onClick={() => setEnrollModalOpen(false)} 
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  >
                      <X size={20} />
                  </button>
                  
                  <div className="p-6 text-center">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Enroll Biometric</h3>
                      <p className="text-sm text-gray-500 mb-6">Registering fingerprint for <br/><span className="font-semibold text-gray-800">{enrollEmployee.name}</span></p>
                      
                      <div 
                        onClick={enrollStage === 'IDLE' ? simulateEnrollScan : undefined}
                        className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 cursor-pointer transition-all duration-300 ${
                            enrollStage === 'IDLE' ? 'bg-blue-50 text-blue-500 hover:bg-blue-100 hover:scale-105 ring-4 ring-blue-50' : 
                            enrollStage === 'SCANNING' ? 'bg-blue-50 text-blue-600 ring-4 ring-blue-200 animate-pulse' : 
                            enrollStage === 'SUCCESS' ? 'bg-green-50 text-green-500 ring-4 ring-green-100' :
                            'bg-red-50 text-red-500 ring-4 ring-red-100'
                        }`}
                      >
                          {enrollStage === 'SCANNING' ? (
                              <div className="relative">
                                  <ScanFace size={48} />
                                  <div className="absolute inset-0 border-t-2 border-blue-600 animate-ping rounded-full opacity-20"></div>
                              </div>
                          ) : enrollStage === 'SUCCESS' ? (
                              <CheckCircle size={48} className="animate-bounce" />
                          ) : enrollStage === 'ERROR' ? (
                              <AlertTriangle size={48} />
                          ) : (
                              <Fingerprint size={48} />
                          )}
                      </div>

                      <div className="text-center h-8">
                          {enrollStage === 'IDLE' && <p className="text-sm text-gray-600">Tap icon to scan finger</p>}
                          {enrollStage === 'SCANNING' && <p className="text-sm text-blue-600 font-medium">Scanning sensor...</p>}
                          {enrollStage === 'SUCCESS' && <p className="text-sm text-green-600 font-bold">Registration Complete!</p>}
                          {enrollStage === 'ERROR' && <p className="text-sm text-red-600 font-bold">Scan failed. Try again.</p>}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
