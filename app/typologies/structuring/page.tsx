'use client';

import CytoscapeComponent from 'react-cytoscapejs';

export default function StructuringSandbox() {
  // Static topology simulating multiple smurf accounts feeding into one target pool asset account
  const smurfElements = [
    { data: { id: 'm', label: 'Main Layer Pool' }, position: { x: 300, y: 200 } },
    { data: { id: 's1', label: 'Smurf Acct A' }, position: { x: 100, y: 50 } },
    { data: { id: 's2', label: 'Smurf Acct B' }, position: { x: 100, y: 150 } },
    { data: { id: 's3', label: 'Smurf Acct C' }, position: { x: 100, y: 250 } },
    { data: { id: 's4', label: 'Smurf Acct D' }, position: { x: 100, y: 350 } },
    // Edges mapping structured paths staying safely under the €10,000 alert ceiling
    { data: { source: 's1', target: 'm', label: '€9,800' } },
    { data: { source: 's2', target: 'm', label: '€9,550' } },
    { data: { source: 's3', target: 'm', label: '€9,900' } },
    { data: { source: 's4', target: 'm', label: '€9,750' } },
  ];

  return (
    <main className="p-12 font-sans max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white font-mono">🧱 Structuring Typology ("Smurfing")</h1>
        <p className="text-slate-400 text-sm mt-1">
          Splitting a macro transaction into multiple micro transfers to keep values below typical compliance ceilings.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-slate-950 border border-slate-800 rounded-2xl h-[500px] overflow-hidden">
          <CytoscapeComponent
            elements={smurfElements}
            style={{ width: '100%', height: '100%' }}
            layout={{ name: 'preset' }}
            stylesheet={[
              { selector: 'node', style: { 'background-color': '#e11d48', 'label': 'data(label)', 'color': '#94a3b8', 'font-size': '10px', 'font-family': 'monospace', 'text-valign': 'bottom' as const, 'text-margin-y': 4 } },
              { selector: 'edge', style: { 'width': 2, 'line-color': '#475569', 'target-arrow-color': '#e11d48', 'target-arrow-shape': 'triangle' as const, 'label': 'data(label)', 'font-size': '9px', 'color': '#ffffff', 'text-background-opacity': 1, 'text-background-color': '#0f172a' } }
            ]}
          />
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs font-mono space-y-4 leading-relaxed text-slate-300">
          <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">Compliance Risk Scoreboard</h4>
          <p>Total Layer Capital Realized: <strong className="text-white">€38,990</strong></p>
          <p>Individual Maximum Vector: <strong className="text-emerald-400">€9,900 (CLEARED)</strong></p>
          <hr className="border-slate-800" />
          <p className="text-slate-500">
            Notice how none of these transactions independently trigger standard database `Amount &gt;= 10000` rule choice checks. 
            To catch this pattern on your AWS back-end, you would introduce an EventBridge aggregation window checking transaction frequencies over time grouped by destination accounts.
          </p>
        </div>
      </div>
    </main>
  );
}