"use client";

import { useState, useEffect, useCallback } from "react";
import { GitBranch, Search, Clock, Loader2, ArrowRight, User, Box } from "lucide-react";

interface KGTriple {
  subject: string;
  predicate: string;
  object: string;
  valid_from: string | null;
  valid_to: string | null;
  current: boolean;
  direction?: string;
}

interface Entity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, string>;
  created_at: string;
}

interface KGStats {
  entities: number;
  triples: number;
  current_facts: number;
  expired_facts: number;
  relationship_types: string[];
}

export default function KnowledgePage() {
  const [stats, setStats] = useState<KGStats | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [timeline, setTimeline] = useState<KGTriple[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entityTriples, setEntityTriples] = useState<KGTriple[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/palace/kg")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats ?? null);
        setEntities(data.entities ?? []);
        setTimeline(data.timeline ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectEntity = useCallback(async (name: string) => {
    setSelectedEntity(name);
    setEntityLoading(true);
    try {
      const res = await fetch(`/api/palace/kg/entity?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      setEntityTriples(data.triples ?? []);
    } catch {
      setEntityTriples([]);
    } finally {
      setEntityLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#00f0ff" }} />
      </div>
    );
  }

  const filteredEntities = searchQuery
    ? entities.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entities;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GitBranch className="h-6 w-6" style={{ color: "#00f0ff" }} />
        <h1 className="text-xl font-mono font-bold" style={{ color: "#00f0ff" }}>
          Knowledge Graph
        </h1>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Entities", value: stats.entities, color: "#00f0ff" },
            { label: "Triples", value: stats.triples, color: "#e879f9" },
            { label: "Current Facts", value: stats.current_facts, color: "#39ff14" },
            { label: "Expired", value: stats.expired_facts, color: "#4a6a8a" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded border p-3 text-center"
              style={{ borderColor: `${color}33`, background: `${color}08` }}
            >
              <div className="text-2xl font-mono font-bold" style={{ color }}>
                {value}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#4a6a8a" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" style={{ color: "#00f0ff66" }} />
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#00f0ff66" }}>
              Entities
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#4a6a8a" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter entities..."
              className="w-full pl-9 pr-3 py-2 rounded font-mono text-xs border bg-transparent focus:outline-none"
              style={{ borderColor: "#00f0ff33", color: "#c4d5e8" }}
            />
          </div>

          <div className="space-y-1 max-h-[500px] overflow-auto">
            {filteredEntities.map((e) => (
              <button
                key={e.id}
                onClick={() => selectEntity(e.name)}
                className="w-full text-left px-3 py-2 rounded font-mono text-xs transition-all flex items-center gap-2"
                style={{
                  background: selectedEntity === e.name ? "#00f0ff15" : "transparent",
                  borderLeft: selectedEntity === e.name ? "2px solid #00f0ff" : "2px solid transparent",
                  color: selectedEntity === e.name ? "#00f0ff" : "#4a6a8a",
                }}
              >
                <Box className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{e.name}</span>
                <span className="text-[9px]" style={{ color: "#4a6a8a66" }}>{e.type}</span>
              </button>
            ))}
            {filteredEntities.length === 0 && (
              <p className="text-xs font-mono py-4 text-center" style={{ color: "#4a6a8a" }}>
                No entities found
              </p>
            )}
          </div>
        </div>

        {/* Entity Detail */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" style={{ color: "#e879f966" }} />
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#e879f966" }}>
              {selectedEntity ? `Relationships — ${selectedEntity}` : "Select an entity"}
            </span>
          </div>

          {entityLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#e879f9" }} />
            </div>
          )}

          {!entityLoading && entityTriples.length > 0 && (
            <div className="space-y-2">
              {entityTriples.map((t, i) => (
                <div
                  key={i}
                  className="rounded border p-3 font-mono text-xs"
                  style={{
                    borderColor: t.current ? "#e879f933" : "#4a6a8a22",
                    background: t.current ? "#e879f908" : "transparent",
                    opacity: t.current ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: "#00f0ff" }}>{t.subject}</span>
                    <ArrowRight className="h-3 w-3" style={{ color: "#4a6a8a" }} />
                    <span style={{ color: "#e879f9" }}>{t.predicate}</span>
                    <ArrowRight className="h-3 w-3" style={{ color: "#4a6a8a" }} />
                    <span style={{ color: "#39ff14" }}>{t.object}</span>
                  </div>
                  {(t.valid_from || t.valid_to) && (
                    <div className="mt-1.5 flex items-center gap-1.5" style={{ color: "#4a6a8a" }}>
                      <Clock className="h-2.5 w-2.5" />
                      <span className="text-[10px]">
                        {t.valid_from ?? "?"} → {t.valid_to ?? "present"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!entityLoading && selectedEntity && entityTriples.length === 0 && (
            <p className="text-xs font-mono py-4 text-center" style={{ color: "#4a6a8a" }}>
              No relationships found
            </p>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: "#39ff1466" }} />
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#39ff1466" }}>
              Timeline
            </span>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-auto">
            {timeline.map((t, i) => (
              <div
                key={i}
                className="rounded border px-3 py-2 font-mono text-[11px] flex items-center gap-2"
                style={{
                  borderColor: t.current ? "#39ff1433" : "#4a6a8a22",
                  opacity: t.current ? 1 : 0.5,
                }}
              >
                <span className="text-[9px] shrink-0" style={{ color: "#4a6a8a" }}>
                  {t.valid_from ?? "?"}
                </span>
                <span style={{ color: "#c4d5e8" }}>
                  {t.subject} <span style={{ color: "#e879f9" }}>{t.predicate}</span> {t.object}
                </span>
              </div>
            ))}
            {timeline.length === 0 && (
              <p className="text-xs font-mono py-4 text-center" style={{ color: "#4a6a8a" }}>
                No timeline events
              </p>
            )}
          </div>

          {/* Relationship Types */}
          {stats && stats.relationship_types.length > 0 && (
            <div className="space-y-2 pt-3">
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#4a6a8a44" }}>
                Relationship Types
              </span>
              <div className="flex flex-wrap gap-1">
                {stats.relationship_types.map((rt) => (
                  <span
                    key={rt}
                    className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ background: "#e879f915", color: "#e879f988" }}
                  >
                    {rt}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
