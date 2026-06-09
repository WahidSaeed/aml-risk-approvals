'use client';

import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

export default function FunnelSandbox() {
  const elements = [
    { data: { id: 'f1', label: 'Cash Biz A (DE)' },     position: { x: 60,  y: 60  } },
    { data: { id: 'f2', label: 'Cash Biz B (PL)' },     position: { x: 60,  y: 160 } },
    { data: { id: 'f3', label: 'Cash Biz C (RO)' },     position: { x: 60,  y: 260 } },
    { data: { id: 'f4', label: 'Cash Biz D (HU)' },     position: { x: 60,  y: 360 } },
    { data: { id: 'agg', label: 'Aggregator Account' }, position: { x: 260, y: 210 } },
    { data: { id: 'out', label: 'Exit Wire (CH)' },     position: { x: 450, y: 210 } },

    { data: { source: 'f1', target: 'agg', label: '€18,400' } },
    { data: { source: 'f2', target: 'agg', label: '€22,100' } },
    { data: { source: 'f3', target: 'agg', label: '€15,900' } },
    { data: { source: 'f4', target: 'agg', label: '€19,600' } },
    { data: { source: 'agg', target: 'out', label: '€76,000' } },
  ];

  // FIXED: Converted stylesheet interface array to cytoscape.StylesheetStyle[] 
  // to avoid type collisions and compiler exit codes on Next.js deployment builds
  const stylesheet: cytoscape.StylesheetStyle[] = [
    {
      selector: 'node[id ^= "f"]',
      style: {
        'background-color': '#f97316',
        'label': 'data(label)',
        'color': '#94a3b8',
        'font-size': '10px',
        'font-family': 'monospace',
        'text-valign': 'bottom',
        'text-margin-y': 4,
      }
    },
    {
      selector: 'node[id = "agg"]',
      style: {
        'background-color': '#e11d48',
        'width': 60,
        'height': 60,
        'label': 'data(label)',
        'color': '#94a3b8',
        'font-size': '10px',
        'font-family': 'monospace',
        'text-valign': 'bottom',
        'text-margin-y': 8,
      }
    },
    {
      selector: 'node[id = "out"]',
      style: {
        'background-color': '#6366f1',
        'label': 'data(label)',
        'color': '#94a3b8',
        'font-size': '10px',
        'font-family': 'monospace',
        'text-valign': 'bottom',
        'text-margin-y': 4,
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#475569',
        'target-arrow-color': '#e11d48',
        'target-arrow-shape': 'triangle',
        'label': 'data(label)',
        'font-size': '9px',
        'color': '#ffffff',
        'text-background-opacity': 1,
        'text-background-color': '#0f172a',
        'curve-style': 'bezier', // Added for clean direction layout
      }
    }
  ];

  return (
    <main className="p-12 font-sans max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white font-mono">🌀 Fan-In Aggregation Typology</h1>
        <p className="text-slate-400 text-sm mt-1">
          Multiple cash-intensive businesses funnel deposits into a single aggregator before a single large cross-border exit wire.
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
          <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">Aggregation Alert Panel</h4>
          <p>Inbound Sources: <strong className="text-orange-400">4 entities</strong></p>
          <p>Aggregated Total: <strong className="text-white">€76,000</strong></p>
          <p>Exit Jurisdiction: <strong className="text-rose-400">Switzerland (High Risk)</strong></p>
          <hr className="border-slate-800" />
          <p className="text-slate-500">
            The aggregator node has an unusually high in-degree (many senders, one receiver) relative to its account age. Your DynamoDB Stream trigger should compute <code>in_degree / account_age_days</code> and route to Step Functions when the ratio exceeds your threshold — regardless of individual transfer sizes.
          </p>
        </div>
      </div>
    </main>
  );
}
