'use client';

import { useState, useEffect, useRef } from 'react';
import { getPendingTransactions, submitApproval } from './actions/aml';

interface AMLCase {
  id: string;
  token: string;
  amount: number;
  currency: string;
  origin: string;
  destination: string;
  riskScore: number;
  reasoning: string;
}

export default function AMLDashboard() {
  const [cases, setCases] = useState<AMLCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<AMLCase | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [actioning, setActioning] = useState<boolean>(false);
  
  const isViewingModal = useRef(false);

  useEffect(() => {
    // Initial fetch to get foundational data
    loadQueue();

    // Background stream polling every 5 seconds
    const queueListener = setInterval(() => {
      loadQueue(); 
    }, 5000);

    return () => clearInterval(queueListener);
  }, []);

  useEffect(() => {
    isViewingModal.current = selectedCase !== null;
  }, [selectedCase]);

  async function loadQueue() {
    const incomingData: AMLCase[] = await getPendingTransactions();
    
    setCases((prevCases) => {
      // 1. Map existing IDs for quick O(1) lookups
      const prevIds = new Set(prevCases.map(c => c.id));
      const incomingIds = new Set(incomingData.map(c => c.id));

      // 2. Identify brand new cases that dropped into the stream
      const newCases = incomingData.filter(c => !prevIds.has(c.id));

      // 3. Filter out any local cases that have been resolved and cleared from the backend database
      const activeExistingCases = prevCases.filter(c => incomingIds.has(c.id));

      // 4. Return the combined set: New cases prepended to the top of the table view
      if (newCases.length === 0 && activeExistingCases.length === prevCases.length) {
        return prevCases; // No data changes, maintain reference equality to skip re-renders
      }
      
      return [...newCases, ...activeExistingCases];
    });
  }

  async function handleDecision(decision: 'APPROVED' | 'REJECTED') {
    if (!selectedCase) return;
    
    if (!notes.trim()) {
      alert("Please provide investigation log notes before closing the case.");
      return;
    }

    setActioning(true);
    const res = await submitApproval(selectedCase.id, selectedCase.token, decision, notes);
    setActioning(false);

    if (res.success) {
      setSelectedCase(null);
      setNotes('');
      loadQueue(); 
    } else {
      alert(`Failed to submit decision: ${res.error}`);
    }
  }

  return (
    <main className="p-8 max-w-6xl mx-auto min-h-screen bg-slate-50 text-slate-800">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">AML Operations Center</h1>
          <span className="flex h-2 w-2 relative mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 mt-1">
            Live Stream Syncing
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">New incoming anomalies will append directly to the top of the queue</p>
      </div>

      {/* Dynamic Escalation Table Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Transaction ID</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Routing Corridor</th>
              <th className="p-4">AI Risk Score</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                  Listening for incoming ledger escalations...
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors transition-all duration-500 animate-in slide-in-from-top-2 duration-300">
                  <td className="p-4 font-mono font-bold text-slate-900">{c.id}</td>
                  <td className="p-4 font-semibold text-slate-900">
                    {c.amount.toLocaleString()} {c.currency}
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-slate-500">{c.origin}</span> 
                    <span className="text-slate-400 mx-2">➔</span> 
                    <span className="font-medium text-slate-700">{c.destination}</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                      ⚠️ {c.riskScore}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedCase(c)} 
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Investigator Portal Overlay Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Case Analysis: {selectedCase.id}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Review system payload variables below</p>
              </div>
              <button 
                onClick={() => setSelectedCase(null)} 
                className="text-slate-400 hover:text-slate-600 text-2xl font-light leading-none p-1"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium block uppercase tracking-wider mb-0.5">Value Summary</span>
                  <strong className="text-base font-bold text-slate-900">
                    {selectedCase.amount.toLocaleString()} {selectedCase.currency}
                  </strong>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium block uppercase tracking-wider mb-0.5">Model Evaluation</span>
                  <strong className="text-base font-bold text-rose-600">{selectedCase.riskScore} / 1.0</strong>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Auditable Reasoning Log</h4>
                <div className="text-xs text-slate-300 bg-slate-950 p-4 rounded-xl font-mono leading-relaxed max-h-40 overflow-y-auto shadow-inner border border-slate-800">
                  {selectedCase.reasoning}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Investigator Context Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
                  rows={3}
                  placeholder="Mandatory: Document clear mitigation parameters..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button 
                onClick={() => handleDecision('REJECTED')} 
                disabled={actioning} 
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {actioning ? 'Processing...' : 'Reject & Block Funds'}
              </button>
              <button 
                onClick={() => handleDecision('APPROVED')} 
                disabled={actioning} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {actioning ? 'Processing...' : 'Approve & Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}