'use client';

import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';

interface NetworkNode {
  id: string;
  label: string;
  isCenter: boolean;
}

interface NetworkEdge {
  timestamp: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  format: string;
}

export default function TransactionStreamingSimulator() {
  const [accountInput, setAccountInput] = useState<string>('8000F4580');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  const socketRef = useRef<WebSocket | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // Structural Grid Trigger: Runs every time nodes or edges append to snap them into a circuit alignment
  useEffect(() => {
    if (cyRef.current && nodes.length > 0) {
      const layout = cyRef.current.layout({
        name: 'grid',         // Fixed matrix grid layout
        animate: true,
        animationDuration: 250,
        fit: true,
        padding: 40,
        avoidOverlap: true,
        cols: Math.ceil(Math.sqrt(nodes.length)) // Computes an optimized square grid layout dynamic ratio
      });
      layout.run();
    }
  }, [nodes.length, edges.length]);

  const startStreamingTrace = () => {
    if (!accountInput.trim()) return;
    
    setNodes([]);
    setEdges([]);
    setLogs(['📡 Connecting to transaction-streaming core infrastructure...']);
    setIsStreaming(true);

    const wsUrl = 'wss://0frgyfwbg2.execute-api.eu-central-1.amazonaws.com/transaction_streaming/';
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      setIsConnected(true);
      setLogs((prev) => [...prev, '✅ Handshake validated. Persistent duplex pipe open.']);
      
      const payload = {
        action: 'startTrace',
        accountNumber: accountInput.trim()
      };
      
      setLogs((prev) => [...prev, `⚡ Triggering dynamic trace sequence for account: ${accountInput}`]);
      socketRef.current?.send(JSON.stringify(payload));
    };

    socketRef.current.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        
        switch (packet.event) {
          case 'NODE_DISCOVERED':
            const newNode: NetworkNode = packet.data;
            setNodes((prev) => {
              if (prev.some(node => node.id === newNode.id)) return prev;
              return [...prev, newNode];
            });
            setLogs((prev) => [...prev, `🟢 NODE ADDED: ${newNode.id}`]);
            break;

          case 'EDGE_PULSED':
            const newEdge: NetworkEdge = packet.data;
            setEdges((prev) => [...prev, newEdge]);
            setLogs((prev) => [
              ...prev, 
              `💥 EDGE PULSED: ${newEdge.from_account} ──[$${newEdge.amount}]──> ${newEdge.to_account}`
            ]);
            break;

          case 'STREAM_COMPLETE':
            setLogs((prev) => [...prev, '🏁 STREAM COMPLETE: AWS Lambda finalized S3 scan cleanly.']);
            setIsStreaming(false);
            socketRef.current?.close();
            break;

          case 'ERROR':
            setLogs((prev) => [...prev, `❌ BACKEND ERROR: ${packet.message}`]);
            setIsStreaming(false);
            break;
        }
      } catch (err) {
        console.error('Parsing failure:', err);
      }
    };

    socketRef.current.onclose = () => {
      setIsConnected(false);
      setIsStreaming(false);
      setLogs((prev) => [...prev, '🔒 WebSocket connection closed channel safely.']);
    };
  };

  const cytoscapeElements = [
    ...nodes.map(node => ({
      data: { id: node.id, label: node.label },
      classes: node.isCenter ? 'seed' : 'entity'
    })),
    ...edges.map((edge, index) => ({
      data: {
        id: `edge-${index}`,
        source: edge.from_account,
        target: edge.to_account,
        label: `$${edge.amount.toLocaleString()}`
      }
    }))
  ];

  // Technical Circuit-Board Stylesheet Optimization
  const graphStyles:cytoscape.StylesheetJsonBlock[] = [
    {
      selector: 'node',
      style: {
        'shape': 'rectangle' as const, // Box microchips
        'background-color': '#1e293b',
        'label': 'data(label)',
        'color': '#94a3b8',
        'font-family': 'monospace',
        'font-size': '11px',
        'text-wrap': 'wrap' as const,
        'text-valign': 'center' as const,
        'text-halign': 'center' as const,
        'width': '110px',
        'height': '45px',
        'border-width': '1px',
        'border-color': '#475569',
        'corner-radius': '3px'
      }
    },
    {
      selector: 'node.seed',
      style: {
        'background-color': '#022c22',
        'border-color': '#10b981',
        'border-width': '2px',
        'color': '#34d399',
        'font-weight': 'bold'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#334155',
        'target-arrow-color': '#3b82f6',
        'target-arrow-shape': 'square' as const, // Terminal block arrow look
        
        // --- The Circuit Magic Key Parameters ---
        'curve-style': 'segments' as const,      // Forces strict angle routing paths
        'edge-distances': 'node-position' as const,
        'segment-distances': [0, 0],              
        'segment-weights': [0.25, 0.75],          
        
        'label': 'data(label)',
        'font-size': '9px',
        'color': '#38bdf8', // Neon tracer text
        'font-family': 'monospace',
        'text-background-opacity': 1,
        'text-background-color': '#020617',
        'text-background-padding': '4px',
        'text-background-shape': 'rectangle' as const
      }
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-950 text-slate-100 min-h-screen selection:bg-emerald-500/30">
      <div className="border-b border-slate-900 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-200">AML CORE // STREAMING LAYOUT ENGINE</h1>
          <p className="text-slate-500 text-xs font-mono">Deterministic trace topography matrix</p>
        </div>
        <div className="text-xs font-mono text-slate-600 bg-slate-900 px-3 py-1 border border-slate-800 rounded">
          REV_2026.05 // TERMINAL
        </div>
      </div>

      <div className="bg-slate-900 p-4 rounded-lg flex items-center gap-4 border border-slate-800 shadow-xl">
        <div className="flex-1">
          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Target Matrix Node Address</label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-slate-700 transition"
            value={accountInput}
            onChange={(e) => setAccountInput(e.target.value)}
            disabled={isStreaming}
          />
        </div>
        <button
          onClick={startStreamingTrace}
          disabled={isStreaming}
          className={`h-9 px-5 font-mono text-xs rounded tracking-wider border transition-all uppercase ${
            isStreaming 
              ? 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed' 
              : 'bg-slate-900 border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 active:scale-98'
          }`}
        >
          {isStreaming ? '// EXEC_STREAM' : '// TRACE_FLOW'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rigid Schematic Canvas Viewport */}
        <div className="lg:col-span-2 bg-slate-950 rounded-lg border border-slate-900 h-[580px] flex flex-col justify-between relative shadow-inner">
          <div className="absolute top-3 left-3 bg-slate-900 px-2 py-1 rounded text-[10px] text-slate-500 border border-slate-800 font-mono z-10 uppercase tracking-widest">
            Schematic Interface Viewport
          </div>
          
          <div className="flex-1 w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-90">
            <CytoscapeComponent
              elements={cytoscapeElements}
              style={{ width: '100%', height: '100%' }}
              stylesheet={graphStyles}
              cy={(cy) => { cyRef.current = cy; }}
              zoom={1}
              minZoom={0.3}
              maxZoom={2.5}
              boxSelectionEnabled={false}
            />
          </div>

          <div className="border-t border-slate-900 p-3 bg-slate-900/40 flex justify-between text-[10px] font-mono text-slate-500">
            <div>MATRIX_NODES: <span className="text-emerald-500 font-bold">{nodes.length}</span></div>
            <div>BUS_EDGES: <span className="text-sky-400 font-bold">{edges.length}</span></div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-none ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-800'}`}></span>
              {isConnected ? 'SYS_ONLINE' : 'SYS_IDLE'}
            </div>
          </div>
        </div>

        {/* Live Terminal Telemetry Console */}
        <div className="bg-slate-950 rounded-lg border border-slate-900 p-4 h-[580px] flex flex-col">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 font-mono border-b border-slate-900 pb-2">
            System Log Output Stream
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-2 text-slate-400 scrollbar-thin">
            {logs.map((log, index) => (
              <div key={index} className="leading-relaxed border-l border-slate-800 pl-2 text-slate-400">
                <span className="text-slate-600 mr-1">[{index.toString().padStart(3, '0')}]</span> {log}
              </div>
            ))}
            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        </div>

      </div>
    </div>
  );
}