'use client';

import CytoscapeComponent from 'react-cytoscapejs';

export default function LayeringSandbox() {
  const layeringElements = [
    { data: { id: 'n1', label: 'Origin Corp Shell' }, position: { x: 50, y: 200 } },
    { data: { id: 'n2', label: 'Offshore Trust B' }, position: { x: 200, y: 100 } },
    { data: { id: 'n3', label: 'Holding Co C' }, position: { x: 350, y: 300 } },
    { data: { id: 'n4', label: 'Final Asset Pool' }, position: { x: 500, y: 200 } },
    
    { data: { source: 'n1', target: 'n2', label: 'Wire: €450,000' } },
    { data: { source: 'n2', target: 'n3', label: 'Loan: €445,000' } },
    { data: { source: 'n3', target: 'n4', label: 'Equity: €440,000' } },
  ];

  return (
    <main className="p-12 font-sans max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white font-mono">🔄 Layering Typology Matrix</h1>
        <p className="text-slate-400 text-sm mt-1">
          Passing assets through rapid successions of shell networks to disconnect accountability traces.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-slate-950 border border-slate-800 rounded-2xl h-[500px] overflow-hidden">
          <CytoscapeComponent
            elements={layeringElements}
            style={{ width: '100%', height: '100%' }}
            layout={{ name: 'preset' }}
            stylesheet={[
              { selector: 'node', style: { 'background-color': '#3b82f6', 'label': 'data(label)', 'color': '#94a3b8', 'font-size': '10px', 'font-family': 'monospace', 'text-valign': 'bottom' as const, 'text-margin-y': 4 } },
              { selector: 'edge', style: { 'width': 2, 'line-color': '#3b82f6', 'target-arrow-color': '#3b82f6', 'target-arrow-shape': 'triangle' as const, 'label': 'data(label)', 'font-size': '9px', 'color': '#ffffff', 'text-background-opacity': 1, 'text-background-color': '#0f172a' } }
            ]}
          />
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs font-mono space-y-4 leading-relaxed text-slate-300">
          <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">Audit Trace Log</h4>
          <p>Initial Source: <span className="text-blue-400">Origin Corp Shell</span></p>
          <p>Velocity Metric: <span className="text-rose-400">High (&lt; 24 Hrs Interval)</span></p>
          <hr className="border-slate-800" />
          <p className="text-slate-500">
            In standard databases, these look like completely separate, independent transaction items. 
            By mapping them into an interactive canvas, the system analyst can quickly spot how capital volume remains almost identical as it chains through the network.
          </p>
        </div>
      </div>
    </main>
  );
}