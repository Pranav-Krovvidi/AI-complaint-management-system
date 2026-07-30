import React, { useState } from "react";
import { complaintsApi } from "../api/complaintsApi";
import Badge from "./Badge";

function Section({ title, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{title}</h3>
      {children}
    </div>
  );
}

function ErrorNote({ error }) {
  if (!error) return null;
  return <p className="text-xs text-amber-600 mt-1">AI analysis unavailable for this section: {error}</p>;
}

export default function AICopilotPanel({ complaintId, onApplied }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const handleRunAnalysis = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await complaintsApi.runAiAnalysis(complaintId);
      setAnalysis(response.data);
    } catch (err) {
      setLoadError(err.response?.data?.detail || "Failed to run AI analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (fields) => {
    setApplying(true);
    try {
      await complaintsApi.applyAiSuggestions(complaintId, fields);
      onApplied?.();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">AI Copilot</h2>
        <button
          onClick={handleRunAnalysis}
          disabled={loading}
          className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {loading ? "Analyzing..." : analysis ? "Re-run" : "Run analysis"}
        </button>
      </div>

      {loadError && <p className="text-sm text-red-600 mb-3">{loadError}</p>}

      {!analysis && !loading && (
        <p className="text-sm text-slate-400">
          Run AI analysis to get a summary, risk classification, category suggestion, root cause
          ideas, and CAPA recommendations for this complaint.
        </p>
      )}

      {analysis && (
        <div>
          <Section title="Summary">
            <p className="text-sm">{analysis.summary?.summary}</p>
            <ErrorNote error={analysis.summary?.error} />
          </Section>

          <Section title="Risk level">
            <div className="flex items-center gap-2">
              <Badge value={analysis.risk?.risk_level} />
            </div>
            <p className="text-sm text-slate-500 mt-1">{analysis.risk?.rationale}</p>
            <ErrorNote error={analysis.risk?.error} />
          </Section>

          <Section title="Suggested category">
            <div className="flex items-center gap-2">
              <Badge value={analysis.category?.category} />
              {typeof analysis.category?.confidence === "number" && (
                <span className="text-xs text-slate-400">
                  {Math.round(analysis.category.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <ErrorNote error={analysis.category?.error} />
          </Section>

          <Section title="Likely root causes">
            <ul className="text-sm list-disc list-inside space-y-0.5">
              {(analysis.root_cause?.likely_root_causes || []).map((cause, i) => (
                <li key={i}>{cause}</li>
              ))}
            </ul>
            {analysis.root_cause?.reasoning && (
              <p className="text-xs text-slate-500 mt-1">{analysis.root_cause.reasoning}</p>
            )}
            <ErrorNote error={analysis.root_cause?.error} />
          </Section>

          <Section title="CAPA recommendation">
            {analysis.capa?.corrective_actions?.length > 0 && (
              <>
                <p className="text-xs text-slate-500 mb-0.5">Corrective</p>
                <ul className="text-sm list-disc list-inside space-y-0.5 mb-2">
                  {analysis.capa.corrective_actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
            {analysis.capa?.preventive_actions?.length > 0 && (
              <>
                <p className="text-xs text-slate-500 mb-0.5">Preventive</p>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  {analysis.capa.preventive_actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
            <ErrorNote error={analysis.capa?.error} />
          </Section>

          <Section title="Completeness check">
            <p className="text-sm">
              {analysis.completeness?.is_complete ? "Looks complete." : "Missing information detected."}
            </p>
            {analysis.completeness?.missing_fields?.length > 0 && (
              <ul className="text-sm list-disc list-inside space-y-0.5 mt-1">
                {analysis.completeness.missing_fields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
            {analysis.completeness?.notes && (
              <p className="text-xs text-slate-500 mt-1">{analysis.completeness.notes}</p>
            )}
            <ErrorNote error={analysis.completeness?.error} />
          </Section>

          <div className="border-t border-slate-100 pt-3 mt-3">
            <button
              onClick={() =>
                handleApply({
                  apply_category: true,
                  apply_severity: true,
                  apply_root_cause: true,
                  apply_capa_notes: true,
                })
              }
              disabled={applying}
              className="w-full text-sm bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-md disabled:opacity-50"
            >
              {applying ? "Applying..." : "Apply all suggestions to record"}
            </button>
            <p className="text-xs text-slate-400 mt-1">
              Applies suggested category, severity, root cause, and CAPA notes to this complaint.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
