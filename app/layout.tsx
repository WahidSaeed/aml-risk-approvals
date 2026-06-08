import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegis AML Sandbox",
  description: "Next.js & Serverless AML Engineering Simulator",
};

export default function RootLayout({children}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950 text-slate-100">
      <body className="flex min-h-screen">
        {/* Persistent Left Sidebar Navigation Menu */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-rose-600 rounded-md flex items-center justify-center font-bold text-xs text-white">ACT</div>
                <span className="font-bold font-mono tracking-wider text-sm">AEGIS_SANDBOX</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">v2.0.26 // BERLIN_NODE</p>
            </div>

            <nav className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-3 mb-2 font-mono">Core Engines</span>
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono font-medium rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition">
                Operations Center
              </Link>
              <Link href="/simulator" className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono font-medium rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition">
                Live Scenario Injector
              </Link>

              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-3 pt-6 mb-2 font-mono">Typology Sandboxes</span>
              <Link href="/typologies/structuring" className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition">
                Structuring (Smurfing)
              </Link>
              <Link href="/typologies/layering" className="flex items-center gap-3 px-3 py-2.5 text-xs font-mono font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition">
                Layering (Round-Robin)
              </Link>
            </nav>
          </div>

          <div className="text-[10px] font-mono text-slate-600 border-t border-slate-800/60 pt-4">
            System Design & Next.js Lab Workspace
          </div>
        </aside>

        {/* Content Area viewport */}
        <div className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </div>
      </body>
    </html>
  );
}