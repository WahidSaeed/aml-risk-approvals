'use client';

import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

export default function TradeBasedSandbox() {
  const elements = [
    { data: { id: 'exporter', label: 'Exporter (TR)' },      position: { x: 80,  y: 200 } },
    { data: { id: 'importer', label: 'Importer Shell (DE)' }, position: { x: 300, y: 80  } },
    { data: { id: 'bank_t',   label: 'Correspondent (TR)' },  position: { x: 80,  y: 360 } },
    { data: { id: 'bank_d',   label: 'Correspondent (DE)' },  position: { x: 300, y: 360 } },
    { data: { id: 'final',    label: 'Launderer Profits' },   position: { x: 480, y: 200 } },

    { data: { source: 'exporter',  target: 'importer', label: 'Over-invoiced goods\n(declared €500k / worth €120k)' } },
    { data: { source: 'importer',  target: 'bank_d',   label: 'Wire: €500,000' } },
    { data: { source: 'bank_d',    target: 'bank_t',   label: 'SWIFT Transfer' } },
    { data: { source: 'bank_t',    target: 'exporter', label: 'Settles: €500,000' } },
    { data: { source: 'exporter',  target: 'final',    label: 'Laundered Delta: €380,000' } },
  ];

  // FIXED: Changed type to cytoscape.StylesheetStyle[] 
  // to avoid type collisions and compiler exit codes on Next.js deployment builds
  const stylesheet: cytoscape.StylesheetStyle[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#0d9488',
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
      selector: 'node[id = "final"]',
      style: { 'background-color': '#16a34a' }
    },
    {
      selector: 'node[id = "exporter"]',
      style: { 'background-color': '#e11d48' }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#475569',
        'target-arrow-color': '#0d9488',
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
        <h1 className="text-3xl font-bold text-white font-mono">📦 Trade-Based Laundering (TBML)</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manipulating trade invoices to transfer value across borders — goods are over- or under-invoiced to move the dirty delta as apparent trade settlement.
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
          <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">TBML Risk Indicators</h4>
          <p>Declared Value: <strong className="text-white">€500,000</strong></p>
          <p>Market Value: <strong className="text-rose-400">€120,000</strong></p>
          <p>Laundered Delta: <strong className="text-emerald-400">€380,000 (76%)</strong></p>
          <hr className="border-slate-800" />
          <p className="text-slate-500">
            TBML is detected by comparing <code>invoice_amount</code> against commodity price benchmarks. Your Bedrock risk narrative layer should flag when a declared shipment value exceeds 2× the commodity's known market rate and both counterparties share a director or beneficial owner in your KYC graph.
          </p>
        </div>
      </div>
    </main>
  );
}
