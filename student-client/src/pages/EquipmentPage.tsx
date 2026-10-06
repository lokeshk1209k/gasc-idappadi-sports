import { useState, useEffect, useRef } from 'react';
import {
  Package, CheckCircle, AlertTriangle, Clock, Calendar,
  ShieldAlert, Info, ArrowUpRight, X, User, MapPin, RefreshCw
} from 'lucide-react';
import { getSportImage } from '../utils/sportImages';
import { supabase } from '../lib/supabase';

interface EquipmentItem {
  id: string;
  name: string;
  code?: string;
  category?: string;
  image?: string;
  storageLocation?: string;
}

interface EquipmentTransaction {
  id: string;
  studentId: any;
  studentName: string;
  registerNumber: string;
  equipmentId: string | EquipmentItem;
  equipmentName: string;
  quantity: number;
  issueDate: string;
  issueTime?: string;
  expectedReturnDate: string;
  returnDate?: string;
  returnTime?: string;
  status: 'Issued' | 'Returned' | 'Damaged' | 'Lost';
  returnCondition?: string;
  remarks?: string;
  purpose?: string;
  issuedBy?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
  equipment?: EquipmentItem;
}

const equipmentIcons: Record<string, string> = {
  Volleyball: '🏐',
  Cricket: '🏏',
  Football: '⚽',
  Badminton: '🏸',
  Basketball: '🏀',
  Tennis: '🎾',
  Handball: '🤾',
  Throwball: '🏐',
  Carrom: '🎯',
  Chess: '♟️',
  Athletics: '🏃'
};

const getEmojiForEquipment = (name: string): string => {
  for (const [key, emoji] of Object.entries(equipmentIcons)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '📦';
};

const EquipmentPage = () => {
  const [activeIssued, setActiveIssued] = useState<EquipmentTransaction[]>([]);
  const [history, setHistory] = useState<EquipmentTransaction[]>([]);
  const [stats, setStats] = useState({ currentlyIssued: 0, returned: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issued' | 'history'>('issued');
  const [selectedItem, setSelectedItem] = useState<EquipmentTransaction | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Student register number resolution
  const getStudentRegister = () => {
    try {
      const stored = localStorage.getItem('gasc_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u) {
          const reg = u.register_number || u.registerNumber || u.regNo || u.reg_no || u.id || u.student_id;
          if (reg) return String(reg).trim();
        }
      }
    } catch { /* fallback */ }
    return '';
  };

  const processTransactions = (items: any[]) => {
    const now = new Date();
    const active: EquipmentTransaction[] = [];
    const hist: EquipmentTransaction[] = [];
    const seenIds = new Set<string>();

    items.forEach((item: any) => {
      const id = item.id || `eq_${Date.now()}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);

      const statusNormalized = (item.status && String(item.status).toLowerCase() === 'returned') ? 'Returned' : 'Issued';
      const isPastExpected = statusNormalized === 'Issued' && item.expectedReturnDate && new Date(item.expectedReturnDate) < now;
      const isOverdue = Boolean(isPastExpected);
      let daysOverdue = 0;
      if (isPastExpected) {
        const diffMs = now.getTime() - new Date(item.expectedReturnDate).getTime();
        daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      const tx: EquipmentTransaction = {
        id,
        studentId: item.studentId || item.student_id || '',
        studentName: item.studentName || item.student_name || '',
        registerNumber: item.registerNumber || item.register_number || item.regNo || '',
        equipmentId: item.equipmentId || item.equipment_id || '',
        equipmentName: item.equipmentName || item.equipment_name || item.name || 'Sports Equipment',
        quantity: Number(item.quantity || 1),
        issueDate: item.issueDate || item.issue_date || new Date().toISOString(),
        issueTime: item.issueTime || item.issue_time || '',
        expectedReturnDate: item.expectedReturnDate || item.expected_return_date || '',
        returnDate: item.returnDate || item.return_date || '',
        returnTime: item.returnTime || item.return_time || '',
        status: statusNormalized,
        returnCondition: item.returnCondition || item.return_condition || '',
        remarks: item.remarks || '',
        purpose: item.purpose || '',
        issuedBy: item.issuedBy || item.issued_by || 'Physical Education Dept',
        isOverdue,
        daysOverdue
      };

      if (statusNormalized === 'Issued') {
        active.push(tx);
      } else {
        hist.push(tx);
      }
    });

    setActiveIssued(active);
    setHistory(hist);
    setStats({
      currentlyIssued: active.length,
      returned: hist.length,
      overdue: active.filter(i => i.isOverdue).length
    });
  };

  const fetchEquipmentData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const regNo = getStudentRegister();

    let directLoaded = false;

    // 1. Direct Supabase Cloud Query (Ultra-fast ~100ms response time for sub-second updates)
    try {
      const { data: supaRows } = await supabase
        .from('notifications')
        .select('*')
        .eq('category', 'equipment')
        .order('created_at', { ascending: false });

      if (supaRows && supaRows.length > 0) {
        const cleanReg = regNo.toLowerCase();
        const matched: any[] = [];

        for (const row of supaRows) {
          try {
            const msg = typeof row.message === 'string' ? JSON.parse(row.message) : row.message;
            if (!msg) continue;
            const sender = (row.sender || '').toLowerCase();
            const target = (row.target_audience || '').toLowerCase();
            const tReg = (msg.registerNumber || msg.register_number || msg.regNo || '').toLowerCase();
            const tStudentId = (msg.studentId || msg.student_id || '').toString().toLowerCase();

            const normClean = cleanReg.replace(/[^a-z0-9]/g, '');
            const normSender = sender.replace(/[^a-z0-9]/g, '');
            const normTarget = target.replace(/[^a-z0-9]/g, '');
            const normTReg = tReg.replace(/[^a-z0-9]/g, '');
            const normTStudentId = tStudentId.replace(/[^a-z0-9]/g, '');

            const isMatch = (
              !cleanReg ||
              sender === cleanReg ||
              target.includes(cleanReg) ||
              tReg === cleanReg ||
              tStudentId === cleanReg ||
              (normClean && (
                normSender === normClean ||
                normTarget.includes(normClean) ||
                normTReg === normClean ||
                normTStudentId.includes(normClean)
              ))
            );

            if (isMatch) {
              matched.push(msg);
            }
          } catch {}
        }

        if (matched.length > 0) {
          processTransactions(matched);
          directLoaded = true;
          setLoading(false);
          if (!silent) setIsRefreshing(false);
        } else if (regNo) {
          setActiveIssued([]);
          setHistory([]);
          setStats({ currentlyIssued: 0, returned: 0, overdue: 0 });
          directLoaded = true;
          setLoading(false);
        }
      }
    } catch (sbErr) {
      console.warn('Supabase equipment direct query error:', sbErr);
    }

    // 2. Secondary API fetch (background validation)
    if (regNo) {
      try {
        const token = localStorage.getItem('gasc_token') || localStorage.getItem('token');
        const res = await fetch(`/api/equipment/my-equipment?registerNumber=${encodeURIComponent(regNo)}`, {
          headers: {
            'x-register-number': regNo,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && (data.activeIssued || data.history)) {
            setActiveIssued(data.activeIssued || []);
            setHistory(data.history || []);
            setStats(data.stats || {
              currentlyIssued: (data.activeIssued || []).length,
              returned: (data.history || []).length,
              overdue: (data.activeIssued || []).filter((i: any) => i.isOverdue).length
            });
          }
        }
      } catch (err) {
        /* quiet background fallback */
      }
    }

    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchEquipmentData();

    // Instant Realtime Subscription from Supabase Cloud (Sub-second notification event)
    const channel = supabase
      .channel('equipment-realtime-subsecond-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          // Trigger instant refresh whenever any notification or equipment event arrives
          fetchEquipmentData(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('⚡ Realtime equipment sync active!');
        }
      });

    // 1.5s ultra-fast polling backup for guaranteed instant update
    pollRef.current = setInterval(() => {
      fetchEquipmentData(true);
    }, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      return new Date(isoStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  const overdueItems = activeIssued.filter(item => item.isOverdue);

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                My Sports Equipment
              </h1>
              <p className="text-sm text-slate-400">
                Track all sports gear issued to you by the Physical Education Department.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchEquipmentData()}
          disabled={isRefreshing}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Status'}</span>
        </button>
      </div>

      {/* ── OVERDUE ALERT BANNER (Section 22) ── */}
      {overdueItems.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500/20 via-orange-500/15 to-red-500/10 border border-red-500/40 p-4 md:p-5 shadow-xl shadow-red-500/10 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-red-300 text-base flex items-center gap-2">
                <span>⚠ Equipment Return Reminder</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 uppercase font-semibold">
                  Action Required
                </span>
              </h3>
              <p className="text-sm text-slate-300">
                The expected return date for{' '}
                <strong className="text-white">
                  {overdueItems.map(i => i.equipmentName).join(', ')}
                </strong>{' '}
                has passed. Please return the equipment to the Sports Office (Dr. R. Anitha, Physical Directress) immediately to avoid late marks or penalties.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STATISTICS CARDS (Section 12) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Currently Issued */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0B1528]/80 backdrop-blur-md border border-cyan-500/20 p-5 shadow-lg group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Currently Issued
            </span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{stats.currentlyIssued}</span>
            <span className="text-xs text-slate-400">Active gear</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">In your possession</p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
        </div>

        {/* Card 2: Returned */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0B1528]/80 backdrop-blur-md border border-emerald-500/20 p-5 shadow-lg group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Returned
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{stats.returned}</span>
            <span className="text-xs text-slate-400">Completed returns</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Returned safely</p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
        </div>

        {/* Card 3: Overdue */}
        <div className={`relative overflow-hidden rounded-2xl bg-[#0B1528]/80 backdrop-blur-md border p-5 shadow-lg group transition-all ${
          stats.overdue > 0 ? 'border-red-500/40 bg-red-950/20' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${stats.overdue > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              Overdue
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              stats.overdue > 0 ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-4xl font-black ${stats.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
              {stats.overdue}
            </span>
            <span className="text-xs text-slate-400">Items past deadline</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Requires immediate return</p>
          {stats.overdue > 0 && (
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('issued')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all btn-interactive-ripple"
          style={{
            background: activeTab === 'issued' ? 'var(--accent-gradient)' : 'transparent',
            border: activeTab === 'issued' ? '1px solid var(--accent-border)' : '1px solid transparent',
            color: activeTab === 'issued' ? '#FFFFFF' : 'var(--text-muted)',
            boxShadow: activeTab === 'issued' ? '0 4px 16px var(--accent-glow)' : 'none'
          }}
        >
          <Package className="w-4 h-4" />
          <span>Currently Issued</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'issued' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
          }`}>
            {activeIssued.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all btn-interactive-ripple"
          style={{
            background: activeTab === 'history' ? 'var(--accent-gradient)' : 'transparent',
            border: activeTab === 'history' ? '1px solid var(--accent-border)' : '1px solid transparent',
            color: activeTab === 'history' ? '#FFFFFF' : 'var(--text-muted)',
            boxShadow: activeTab === 'history' ? '0 4px 16px var(--accent-glow)' : 'none'
          }}
        >
          <Clock className="w-4 h-4" />
          <span>Equipment History</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
          }`}>
            {history.length}
          </span>
        </button>
      </div>

      {/* ── CONTENT: CURRENTLY ISSUED (Section 11 & 13) ── */}
      {activeTab === 'issued' && (
        <div>
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p>Loading your sports equipment...</p>
            </div>
          ) : activeIssued.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0B1528]/40 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No Equipment Currently Issued</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                You do not have any sports equipment checked out right now. When the Sports Incharge issues sports gear to your register number, it will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeIssued.map(item => {
                const emoji = getEmojiForEquipment(item.equipmentName);
                const isOverdue = item.isOverdue;

                return (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-300 p-5 flex flex-col justify-between ${
                      isOverdue
                        ? 'bg-gradient-to-b from-[#1C0F15] to-[#0B1528] border-red-500/40 shadow-xl shadow-red-500/10'
                        : 'bg-[#0B1528]/90 border-cyan-500/20 hover:border-cyan-500/50 shadow-xl shadow-black/40'
                    }`}
                  >
                    <div>
                      {/* Top Header: Badge & Status */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl" role="img" aria-label="sports icon">
                          {emoji}
                        </span>

                        {isOverdue ? (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-500/20 border border-red-500/40 text-red-300 flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            OVERDUE ({item.daysOverdue}d)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            ● ISSUED
                          </span>
                        )}
                      </div>

                      {/* Equipment Title */}
                      <h3 className="text-lg font-bold text-white line-clamp-1 mb-1">
                        {item.equipmentName}
                      </h3>
                      <p className="text-xs text-slate-400 mb-4">
                        Quantity:{' '}
                        <strong className="text-white font-semibold">{item.quantity} unit(s)</strong>
                      </p>

                      {/* Details Box */}
                      <div className="space-y-2 rounded-xl bg-white/[0.03] border border-white/5 p-3 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                            Issued On:
                          </span>
                          <span className="font-semibold text-white">
                            {formatDate(item.issueDate)} {item.issueTime ? `• ${item.issueTime}` : ''}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`} />
                            Expected Return:
                          </span>
                          <span className={`font-semibold ${isOverdue ? 'text-red-400 font-bold' : 'text-amber-300'}`}>
                            {formatDate(item.expectedReturnDate)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/5">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-purple-400" />
                            Issued By:
                          </span>
                          <span className="text-slate-200">
                            {item.issuedBy || 'Sports Incharge'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-mono">
                        Ref: #{item.id.slice(-6).toUpperCase()}
                      </span>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-cyan-500 hover:text-black text-white transition-all active:scale-95"
                      >
                        <span>View Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTENT: EQUIPMENT HISTORY (Section 19 & 24) ── */}
      {activeTab === 'history' && (
        <div>
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p>Loading equipment history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0B1528]/40 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No Previous Returns</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Completed equipment returns will appear in this history log once verified by the Sports Department.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0B1528]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-slate-400 uppercase font-semibold tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">Equipment</th>
                      <th className="py-3.5 px-4">Quantity</th>
                      <th className="py-3.5 px-4">Issued On</th>
                      <th className="py-3.5 px-4">Returned On</th>
                      <th className="py-3.5 px-4">Return Condition</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {history.map(item => {
                      const emoji = getEmojiForEquipment(item.equipmentName);

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                            <span className="text-lg">{emoji}</span>
                            <span>{item.equipmentName}</span>
                          </td>
                          <td className="py-3.5 px-4">{item.quantity} unit(s)</td>
                          <td className="py-3.5 px-4">
                            {formatDate(item.issueDate)} {item.issueTime ? `• ${item.issueTime}` : ''}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-300 font-medium">
                            {item.returnDate ? (
                              `${formatDate(item.returnDate)} ${item.returnTime ? `• ${item.returnTime}` : ''}`
                            ) : (
                              'Returned'
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {item.returnCondition || 'Good'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              ✓ RETURNED
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DETAILS MODAL (Section 13) ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B1528] border border-cyan-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-scale-up">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getEmojiForEquipment(selectedItem.equipmentName)}</span>
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">
                  {selectedItem.equipmentName}
                </h3>
                <span className="text-xs text-slate-400">
                  Transaction #{selectedItem.id.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2">
              {selectedItem.status === 'Issued' ? (
                selectedItem.isOverdue ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                    ⚠ OVERDUE ({selectedItem.daysOverdue} Days Past Return Date)
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    ● CURRENTLY ISSUED
                  </span>
                )
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ RETURNED ({selectedItem.returnCondition || 'Good Condition'})
                </span>
              )}
            </div>

            {/* Grid Details */}
            <div className="space-y-3 bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Quantity Issued:</span>
                <span className="text-white font-bold">{selectedItem.quantity} unit(s)</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Issued On:</span>
                <span className="text-white font-medium">
                  {formatDate(selectedItem.issueDate)} {selectedItem.issueTime ? `at ${selectedItem.issueTime}` : ''}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Expected Return:</span>
                <span className={`font-semibold ${selectedItem.isOverdue ? 'text-red-400' : 'text-amber-300'}`}>
                  {formatDate(selectedItem.expectedReturnDate)}
                </span>
              </div>

              {selectedItem.returnDate && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Returned On:</span>
                  <span className="text-emerald-300 font-medium">
                    {formatDate(selectedItem.returnDate)} {selectedItem.returnTime ? `at ${selectedItem.returnTime}` : ''}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Issued By:</span>
                <span className="text-white font-medium">{selectedItem.issuedBy || 'Dr. R. ANITHA (Sports Incharge)'}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Student Name:</span>
                <span className="text-white font-medium">{selectedItem.studentName} ({selectedItem.registerNumber})</span>
              </div>

              {selectedItem.purpose && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Purpose:</span>
                  <span className="text-slate-200">{selectedItem.purpose}</span>
                </div>
              )}

              {selectedItem.remarks && (
                <div className="pt-1">
                  <span className="text-slate-400 block mb-0.5">Staff Remarks:</span>
                  <span className="text-slate-300 italic">{selectedItem.remarks}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentPage;
