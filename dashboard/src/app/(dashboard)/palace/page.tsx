"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Archive, FolderOpen, FileText, Loader2 } from "lucide-react";

interface PalaceHit {
  text: string;
  wing: string;
  room: string;
  source_file: string;
  similarity: number;
}

interface WingInfo {
  count: number;
  rooms: Record<string, number>;
}

interface PalaceStatus {
  available: boolean;
  drawers: number;
  wings: Record<string, WingInfo>;
  kg: { entities: number; triples: number; current_facts: number } | null;
}

export default function PalacePage() {
  const [status, setStatus] = useState<PalaceStatus | null>(null);
  const [query, setQuery] = useState("");
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [results, setResults] = useState<PalaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/palace/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ available: false, drawers: 0, wings: {}, kg: null }))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/palace/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          wing: selectedWing,
          room: selectedRoom,
          n_results: 15,
        }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, selectedWing, selectedRoom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#e879f9" }} />
      </div>
    );
  }

  const wings = status?.wings ?? {};
  const wingNames = Object.keys(wings).sort();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Archive className="h-6 w-6" style={{ color: "#e879f9" }} />
        <h1 className="text-xl font-mono font-bold" style={{ color: "#e879f9" }}>
          Memory Palace
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: status?.available ? "#39ff14" : "#ff2d5e",
              boxShadow: status?.available ? "0 0 6px #39ff14" : "0 0 6px #ff2d5e",
            }}
          />
          <span className="text-xs font-mono" style={{ color: "#4a6a8a" }}>
            {status?.drawers ?? 0} drawers
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#4a6a8a" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search the palace..."
            className="w-full pl-10 pr-4 py-2.5 rounded font-mono text-sm border bg-transparent focus:outline-none"
            style={{
              borderColor: "#e879f933",
              color: "#c4d5e8",
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-4 py-2.5 rounded font-mono text-sm font-bold transition-all"
          style={{
            background: searching ? "#e879f933" : "#e879f9",
            color: searching ? "#e879f9" : "#000",
          }}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {/* Wing / Room Filters */}
      <div className="flex gap-4">
        {/* Wings */}
        <div className="flex-1 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#e879f966" }}>
            Wings
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setSelectedWing(null); setSelectedRoom(null); }}
              className="px-3 py-1.5 rounded text-xs font-mono border transition-all"
              style={{
                borderColor: !selectedWing ? "#e879f9" : "#e879f933",
                color: !selectedWing ? "#e879f9" : "#4a6a8a",
                background: !selectedWing ? "#e879f915" : "transparent",
              }}
            >
              All
            </button>
            {wingNames.map((w) => (
              <button
                key={w}
                onClick={() => { setSelectedWing(w); setSelectedRoom(null); }}
                className="px-3 py-1.5 rounded text-xs font-mono border transition-all"
                style={{
                  borderColor: selectedWing === w ? "#e879f9" : "#e879f933",
                  color: selectedWing === w ? "#e879f9" : "#4a6a8a",
                  background: selectedWing === w ? "#e879f915" : "transparent",
                }}
              >
                {w} ({wings[w].count})
              </button>
            ))}
          </div>
        </div>

        {/* Rooms (when wing selected) */}
        {selectedWing && wings[selectedWing] && (
          <div className="flex-1 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#00f0ff66" }}>
              Rooms
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedRoom(null)}
                className="px-3 py-1.5 rounded text-xs font-mono border transition-all"
                style={{
                  borderColor: !selectedRoom ? "#00f0ff" : "#00f0ff33",
                  color: !selectedRoom ? "#00f0ff" : "#4a6a8a",
                  background: !selectedRoom ? "#00f0ff15" : "transparent",
                }}
              >
                All
              </button>
              {Object.entries(wings[selectedWing].rooms).map(([r, count]) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoom(r)}
                  className="px-3 py-1.5 rounded text-xs font-mono border transition-all"
                  style={{
                    borderColor: selectedRoom === r ? "#00f0ff" : "#00f0ff33",
                    color: selectedRoom === r ? "#00f0ff" : "#4a6a8a",
                    background: selectedRoom === r ? "#00f0ff15" : "transparent",
                  }}
                >
                  {r} ({count})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#4a6a8a" }}>
            {results.length} results
          </span>
          {results.map((hit, i) => (
            <div
              key={i}
              className="rounded border p-4 space-y-2 transition-all hover:border-opacity-60"
              style={{
                borderColor: "#e879f933",
                background: "#e879f908",
              }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-3.5 w-3.5" style={{ color: "#e879f9" }} />
                <span className="text-xs font-mono font-bold" style={{ color: "#e879f9" }}>
                  {hit.wing}/{hit.room}
                </span>
                <span className="ml-auto text-[10px] font-mono" style={{ color: "#4a6a8a" }}>
                  sim={hit.similarity}
                </span>
                {hit.similarity >= 0.7 && (
                  <span style={{ color: "#fbbf24" }}>&#9733;</span>
                )}
              </div>
              <p className="text-sm font-mono leading-relaxed" style={{ color: "#c4d5e8" }}>
                {hit.text}
              </p>
              {hit.source_file && (
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3" style={{ color: "#4a6a8a" }} />
                  <span className="text-[10px] font-mono" style={{ color: "#4a6a8a" }}>
                    {hit.source_file}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Wing Grid (when no search) */}
      {results.length === 0 && !searching && wingNames.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wingNames.map((w) => (
            <button
              key={w}
              onClick={() => setSelectedWing(w)}
              className="rounded border p-4 text-left transition-all hover:border-opacity-60"
              style={{
                borderColor: "#e879f933",
                background: "#e879f908",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4" style={{ color: "#e879f9" }} />
                <span className="font-mono font-bold text-sm" style={{ color: "#e879f9" }}>
                  {w}
                </span>
              </div>
              <div className="text-xs font-mono" style={{ color: "#4a6a8a" }}>
                {wings[w].count} drawers &middot; {Object.keys(wings[w].rooms).length} rooms
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.keys(wings[w].rooms).slice(0, 5).map((r) => (
                  <span
                    key={r}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "#00f0ff15", color: "#00f0ff88" }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!status?.available && (
        <div className="text-center py-12">
          <Archive className="h-12 w-12 mx-auto mb-4" style={{ color: "#4a6a8a33" }} />
          <p className="font-mono text-sm" style={{ color: "#4a6a8a" }}>
            No palace found. Run: <code>mempalace init &amp;&amp; mempalace mine</code>
          </p>
        </div>
      )}
    </div>
  );
}
