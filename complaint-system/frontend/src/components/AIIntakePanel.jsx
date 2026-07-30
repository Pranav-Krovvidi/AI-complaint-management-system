import React, { useState } from "react";
import { complaintsApi } from "../api/complaintsApi";

export default function AIIntakePanel({ onExtracted }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [extractionNote, setExtractionNote] = useState(null);

  const handleExtract = async () => {
    if (!text.trim() && !file) {
      setError("Paste the complaint email/text and/or upload a PDF or image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setDuplicates([]);
    setExtractionNote(null);
    try {
      const response = await complaintsApi.extractIntake({ text: text.trim(), file });
      const { fields, duplicates: dupes, error: nodeError } = response.data;
      onExtracted?.(fields);
      setDuplicates(dupes || []);
      if (nodeError) {
        setExtractionNote(
          "AI extraction fell back to defaults for some fields — please review the form below carefully."
        );
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Could not extract complaint details. Try again or fill the form manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-medium">AI-Assisted Intake</h2>
        <span className="text-xs text-slate-400">Optional</span>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Paste a customer email or complaint text, and/or upload a PDF or image of the complaint. AI will
        extract the details and pre-fill the form below for you to review before submitting.
      </p>

      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the customer's email or complaint text here..."
        className="w-full mb-3 px-3 py-2 border border-slate-300 rounded-md text-sm"
      />

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md cursor-pointer">
          {file ? file.name : "Upload PDF or image"}
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
        {file && (
          <button type="button" onClick={() => setFile(null)} className="text-xs text-slate-400 hover:text-slate-600">
            Remove
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
      )}

      <button
        type="button"
        onClick={handleExtract}
        disabled={loading}
        className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-60"
      >
        {loading ? "Analyzing with AI..." : "Extract with AI"}
      </button>

      {extractionNote && <p className="text-xs text-amber-600 mt-3">{extractionNote}</p>}

      {duplicates.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
            Possible duplicate complaints found
          </p>
          <ul className="space-y-1.5">
            {duplicates.map((d) => (
              <li key={d.id} className="text-sm flex items-center justify-between bg-amber-50 border border-amber-100 rounded-md px-3 py-1.5">
                <span>
                  <span className="font-medium text-amber-800">{d.complaint_number}</span>{" "}
                  <span className="text-slate-500">— {d.product_name}</span>
                  {d.same_batch_number && <span className="text-amber-600"> (same batch)</span>}
                </span>
                <span className="text-xs text-amber-600">{Math.round(d.similarity * 100)}% similar</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
