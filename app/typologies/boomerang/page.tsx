'use client';

import CytoscapeComponent from 'react-cytoscapejs';

export default function RoundTripSandbox() {
  const elements = [
    { data: { id: 'a', label: 'Entity Alpha (UK)' },   position: { x: 250, y: 60  } },
    { data: { id: 'b', label: 'Nominee BVI' },          position: { x: 430, y: 190 } },
    { data: { id: 'c', label: 'Cayman SPV' },           position: { x: 350, y: 340 } },
    { data: { id: 'd', label: 'Cyprus Holdco' },         position: { x: 150, y: 340 } },
    { data: { id: 'e', label: 'Entity Alpha (UK)' },    position: { x: 70,  y: 190 } },

    { data: { source: 'a', target: 'b', label: 'Wire: €300,000' } },
    { data: { source: 'b', target: 'c', label: 'Loan: €295,000' } },
    { data: { source: 'c', target: 'd', label: 'Dividend: €290,000' } },
    { data: { source: 'd', target: 'e', label: '"Investment": €285,000' } },
  ];

  const nodeStyle = (color: string): cytoscape.StylesheetStyle['style'] => ({
    'background-color': color,
    'label': 'data(label)',
    'color': '#94a3b8',
    'font-size': '10px',
    'font-family': 'monospace',
    'text-valign': 'bottom' as const,
    'text-margin-y': 4,
  });

  const stylesheet: cytoscape.Stylesheet[] = [
    { selector: 'node[id = "a"]', style: nodeStyle('#a855f7') },
    { selector: 'node[id = "b"]', style: nodeStyle('#3b82f6') },
    { selector: 'node[id = "c"]', style: nodeStyle('#3b82f6') },
    { selector: 'node[id = "d"]', style: nodeStyle('#3b82f6') },
    { selector: 'node[id = "e"]', style: nodeStyle('#a855f7') },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#a855f7',
        'target-arrow-color': '#a855f7',
        'target-arrow-shape': 'triangle' as const,
        'label': 'data(label)',
        'font-size': '9px',
        'color': '#ffffff',
        'text-background-opacity': 1,
        'text-background-color': '#0f172a',
        'curve-style': 'bezier' as const,
      }
    }
  ];

  return (
    <main className="p-12 font-sans max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white font-mono">🔁 Round-Trip Cycling Typology</h1>
        <p className="text-slate-400 text-sm mt-1">
          Capital leaves an entity, transits through a chain of offshore nominees, and returns to the same beneficial owner — now appearing as a legitimate foreign investment.
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
          <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-700 pb-2">Cycle Detection Log</h4>
          <p>Origin Entity: <span className="text-purple-400">Entity Alpha (UK)</span></p>
          <p>Terminal Entity: <span className="text-purple-400">Entity Alpha (UK)</span></p>
          <p>Capital Decay: <strong className="text-rose-400">−4.9% across 4 hops</strong></p>
          <hr className="border-slate-800" />
          <p className="text-slate-500">
            The canonical detection signal is a closed-loop graph walk where <code>sender_account == receiver_account</code> of the originating node after N hops. Cytoscape's breadth-first traversal or your Step Function's graph topology Lambda can flag this by checking if any node appears in both the source and destination sets of a traversal path.
          </p>
        </div>
      </div>
    </main>
  );
}
