'use client';

import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

export default function HawalaSandbox() {
  const elements = [
    { data: { id: 'sender',   label: 'Remitter (UK)' },        position: { x: 80,  y: 200 } },
    { data: { id: 'broker_a', label: 'Hawaladar A (UK)' },     position: { x: 240, y: 100 } },
    { data: { id: 'broker_b', label: 'Hawaladar B (PK)' },     position: { x: 400, y: 100 } },
    { data: { id: 'receiver', label: 'Beneficiary (PK)' },     position: { x: 520, y: 200 } },
    { data: { id: 'settle',   label: 'Gold / Commodity\nSettlement' }, position: { x: 300, y: 330 } },

    { data: { source: 'sender',   target: 'broker_a', label: '£85,000 cash' } },
    { data: { source: 'broker_a', target: 'broker_b', label: 'Code word only\n(no wire)' } },
    { data: { source: 'broker_b', target: 'receiver', label: 'PKR equivalent\npaid locally' } },
    { data: { source: 'broker_a', target: 'settle',   label: 'IOU: £85,000' } },
    { data: { source: 'settle',   target: 'broker_b', label: 'Physical offset' } },
  ];

  // FIXED: Adjusted interface assignment to cytoscape.StylesheetStyle[] 
  // to clean up namespace checking constraints inside Turbopack compilers
  const stylesheet: cytoscape.StylesheetStyle[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#9333ea',
        'label': 'data(label)',
        'color': '#94a3b8',
        'font-size': '10px',
        'font-family': 'monospace',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'text-wrap': 'wrap',
        'text-max-width': 90,
      }
    },
    {
      selector: 'node[id = "settle"]',
      style: { 'background-color': '#b45309' }
    },
    {
      selector: 'node[id = "sender"]',
      style: { 'background-color': '#dc2626' }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#475569',
        'target-arrow-color': '#9333ea',
        'target-arrow-shape': 'triangle',
        'label': 'data(label)',
        'font-size': '8px',
        'color': '#ffffff',
        'text-background-opacity': 1,
        'text-background-color': '#0f172a',
        'text-wrap': 'wrap',
        'text-max-width': 100,
        'curve-style': 'bezier',
      }
    }
  ];

  return (
    <main className="p-12 font-sans max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white font-mono">🕌 Hawala / Informal Value Transfer</h1>
        <p className="text-slate-400 text-sm mt-1">
          Value moves across borders via a trust-based broker network — no wire transfer occurs, leaving zero trace in the formal banking system.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-slate-950 border border-slate-800 rounded-2xl h-[500px] overflow-hidden">
          <CytoscapeComponent
            elements={elements}
            style={{ width: '100%', height: '100%' }}
            layout={{ name: 'preset' }}
            stylesheet={stylesheet}
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs font-mono space-y-4 leading-relaxed text-slate-300">
          <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">Informal Network Indicators</h4>
          <p>Formal Wire Detected: <strong className="text-rose-400">NONE</strong></p>
          <p>Value Transferred: <strong className="text-white">£85,000</strong></p>
          <p>Corridor: <strong className="text-purple-400">UK → Pakistan</strong></p>
          <hr className="border-slate-800" />
          <p className="text-slate-500">
            Hawala leaves no SWIFT records. Detection relies on behavioural signals: large recurring cash deposits from the remitter with no corresponding outbound wire, and a matching cash withdrawal at the beneficiary end. Your Bedrock narrative should flag accounts where <code>cash_in_ratio {'>'} 0.80</code> and destination is a known high-risk remittance corridor.
          </p>
        </div>
      </div>
    </main>
  );
}
