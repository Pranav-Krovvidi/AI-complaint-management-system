import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createComplaint } from "../store/slices/complaintSlice";
import { complaintsApi } from "../api/complaintsApi";
import AIIntakePanel from "../components/AIIntakePanel";

const VALID_CATEGORIES = new Set([
  "product_quality",
  "packaging",
  "adverse_event",
  "labeling",
  "delivery_logistics",
  "other",
]);
const VALID_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

const initialForm = {
  product_name: "",
  batch_number: "",
  customer_name: "",
  customer_contact: "",
  description: "",
  category: "product_quality",
  severity: "medium",
};

export default function LogComplaintForm() {
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleExtracted = (fields) => {
    setForm((prev) => ({
      ...prev,
      product_name: fields.product_name || prev.product_name,
      batch_number: fields.batch_number || prev.batch_number,
      customer_name: fields.customer_name || prev.customer_name,
      customer_contact: fields.customer_contact || prev.customer_contact,
      description: fields.description || prev.description,
      category: VALID_CATEGORIES.has(fields.category) ? fields.category : prev.category,
      severity: VALID_SEVERITIES.has(fields.severity) ? fields.severity : prev.severity,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await dispatch(createComplaint(form));
    if (createComplaint.fulfilled.match(result)) {
      const newComplaintId = result.payload.id;
      if (file) {
        try {
          await complaintsApi.uploadAttachment(newComplaintId, file);
        } catch {
          // Complaint was created successfully; surface the attachment issue but don't block navigation.
          setError("Complaint logged, but the attachment failed to upload. You can retry from the details page.");
        }
      }
      navigate(`/complaints/${newComplaintId}`);
    } else {
      setError(result.payload || "Failed to log complaint");
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Log a Complaint</h1>
      <p className="text-sm text-slate-500 mb-6">
        Use AI-assisted intake below to auto-fill this form from an email or document, or fill it in manually.
      </p>

      <AIIntakePanel onExtracted={handleExtracted} />

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product name *</label>
            <input
              name="product_name"
              required
              value={form.product_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Batch number</label>
            <input
              name="batch_number"
              value={form.batch_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer name</label>
            <input
              name="customer_name"
              value={form.customer_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer contact</label>
            <input
              name="customer_contact"
              value={form.customer_contact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="product_quality">Product quality</option>
              <option value="packaging">Packaging</option>
              <option value="adverse_event">Adverse event</option>
              <option value="labeling">Labeling</option>
              <option value="delivery_logistics">Delivery / logistics</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Severity</label>
            <select
              name="severity"
              value={form.severity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea
            name="description"
            required
            rows={5}
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the complaint in detail: what happened, when, and any relevant context..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Attach evidence (PDF or image, optional)</label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-md font-medium disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit complaint"}
        </button>
      </form>
    </div>
  );
}
