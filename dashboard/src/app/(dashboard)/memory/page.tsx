"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Archive, GitBranch, Zap, Loader2, RefreshCw } from "lucide-react";

interface PalaceStatus {
  available: boolean;
  drawers: number;
  wings: Record<string, { count: number; rooms: Record<string, number> }>;
  kg: { entities: number; triples: number; current_facts: number; expired_facts: number } | null;
}

interface CompressResult {
  compressed: string;
  stats: {
    original_tokens: number;
    compressed_tokens: number;
    ratio: number;
    original_chars: number;
    compressed_chars: number;
  };
}

export default function MemoryPage() {
  const [status, setStatus] = useState<PalaceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // AAAK Playground
  const [inputText, setInputText] = useState("");
  const [compressed, setCompressed] = useState<CompressResult | null>(null);
  const [compressing, setCompressing] = useState(false);

  const fetchStatus = useCallback(() => {
    setLoading(true);
    fetch("/api/palace/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleCompress = useCallback(async () => {
    if (!inputText.trim()) return;
    setCompressing(true);
    try {
      const res = await fetch("/api/palace/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim() }),
      });
      setCompressed(await res.json());
    } catch {
      setCompressed(null);
    } finally {
      setCompressing(false);
    }
  }, [inputText]);

  const totalRooms = status
    ? Object.values(status.wings).reduce((sum, w) => sum + Object.keys(w.rooms).length, 0)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6" style={{ color: "#ff006e" }} />
        <h1 className="text-xl font-mono font-bold" style={{ color: "#ff006e" }}>
          Memory System
        </h1>
        <button
          onClick={fetchStatus}
          className="ml-auto p-2 rounded transition-all hover:bg-white/5"
          style={{ color: "#4a6a8a" }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard
          icon={<Archive className="h-5 w-5" />}
          label="Palace"
          value={status?.available ? "Online" : "Offline"}
          sub={`${status?.drawers ?? 0} drawers`}
          color={status?.available ? "#39ff14" : "#ff2d5e"}
        />
        <StatusCard
          icon={<Database className="h-5 w-5" />}
          label="Wings"
          value={String(Object.keys(status?.wings ?? {}).length)}
          sub={`${totalRooms} rooms`}
          color="#e879f9"
        />
        <StatusCard
          icon={<GitBranch className="h-5 w-5" />}
          label="KG Entities"
          value={String(status?.kg?.entities ?? 0)}
          sub={`${status?.kg?.current_facts ?? 0} current facts`}
          color="#00f0ff"
        />
        <StatusCard
          icon={<Zap className="h-5 w-5" />}
          label="KG Triples"
          value={String(status?.kg?.triples ?? 0)}
          sub={`${status?.kg?.expired_facts ?? 0} expired`}
          color="#fbbf24"
        />
      </div>

      {/* Wing Breakdown */}
      {status && Object.keys(status.wings).length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#e879f966" }}>
            Wing Breakdown
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(status.wings)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([wing, info]) => (
                <div
                  key={wing}
                  className="rounded border p-4"
                  style={{ borderColor: "#e879f922", background: "#e879f908" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm" style={{ color: "#e879f9" }}>
                      {wing}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "#4a6a8a" }}>
                      {info.count} drawers
                    </span>
                  </div>

                  {/* Room bar chart */}
                  <div className="space-y-1">
                    {Object.entries(info.rooms)
                      .sort(([, a], [, b]) => b - a)
                      .map(([room, count]) => {
                        const pct = Math.max(5, (count / info.count) * 100);
                        return (
                          <div key={room} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono w-20 truncate" style={{ color: "#4a6a8a" }}>
                              {room}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: "#e879f915" }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: "#e879f966" }}
                              />
                            </div>
                            <span className="text-[9px] font-mono w-6 text-right" style={{ color: "#4a6a8a" }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AAAK Compression Playground */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#fbbf2466" }}>
          AAAK Compression Playground
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste text to compress..."
              rows={6}
              className="w-full p-3 rounded font-mono text-xs border bg-transparent focus:outline-none resize-none"
              style={{ borderColor: "#fbbf2433", color: "#c4d5e8" }}
            />
            <button
              onClick={handleCompress}
              disabled={compressing || !inputText.trim()}
              className="px-4 py-2 rounded font-mono text-xs font-bold transition-all"
              style={{
                background: compressing ? "#fbbf2433" : "#fbbf24",
                color: compressing ? "#fbbf24" : "#000",
              }}
            >
              {compressing ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : "Compress"}
            </button>
          </div>
          <div className="space-y-2">
            <div
              className="p-3 rounded border font-mono text-xs min-h-[144px] whitespace-pre-wrap"
              style={{
                borderColor: "#39ff1433",
                color: "#39ff14",
                background: "#39ff1408",
              }}
            >
              {compressed?.compressed || "AAAK output will appear here..."}
            </div>
            {compressed?.stats && (
              <div className="flex gap-4 text-[10px] font-mono" style={{ color: "#4a6a8a" }}>
                <span>Original: ~{compressed.stats.original_tokens} tokens</span>
                <span>AAAK: ~{compressed.stats.compressed_tokens} tokens</span>
                <span style={{ color: "#fbbf24" }}>{compressed.stats.ratio.toFixed(1)}x ratio</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="rounded border p-4 space-y-1"
      style={{ borderColor: `${color}33`, background: `${color}08` }}
    >
      <div className="flex items-center gap-2">
        <div style={{ color: `${color}88` }}>{icon}</div>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#4a6a8a" }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-mono font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] font-mono" style={{ color: "#4a6a8a" }}>
        {sub}
      </div>
    </div>
  );
}
