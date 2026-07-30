import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchComplaintById,
  updateComplaint,
  clearSelected,
} from "../store/slices/complaintSlice";
import { complaintsApi } from "../api/complaintsApi";
import axiosClient from "../api/axiosClient";
import Badge from "../components/Badge";
import AICopilotPanel from "../components/AICopilotPanel";

export default function ComplaintDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const complaint = useSelector((state) => state.complaints.selected);
  const detailStatus = useSelector((state) => state.complaints.detailStatus);

  useEffect(() => {
    dispatch(fetchComplaintById(id));
    return () => dispatch(clearSelected());
  }, [dispatch, id]);

  const handleFieldUpdate = (field, value) => {
    dispatch(updateComplaint({ id, payload: { [field]: value } }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await complaintsApi.uploadAttachment(id, file);
      dispatch(fetchComplaintById(id));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (attachmentId, filename) => {
    const response = await axiosClient.get(`/complaints/attachments/${attachmentId}/download`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (detailStatus === "loading" || !complaint) {
    return <p className="text-slate-400">Loading complaint...</p>;
  }

  return (
    <div>
      <button onClick={() => navigate("/complaints")} className="text-sm text-brand-600 mb-4 hover:underline">
        ← Back to complaints
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold">{complaint.complaint_number}</h1>
                <p className="text-slate-500">{complaint.product_name}</p>
              </div>
              <div className="flex gap-2">
                <Badge value={complaint.severity} />
                <Badge value={complaint.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-slate-400">Batch number</p>
                <p>{complaint.batch_number || "-"}</p>
              </div>
              <div>
                <p className="text-slate-400">Category</p>
                <p className="capitalize">{complaint.category.replaceAll("_", " ")}</p>
              </div>
              <div>
                <p className="text-slate-400">Customer</p>
                <p>{complaint.customer_name || "-"}</p>
              </div>
              <div>
                <p className="text-slate-400">Contact</p>
                <p>{complaint.customer_contact || "-"}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-slate-400 text-sm mb-1">Description</p>
              <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
            <h2 className="font-medium mb-3">Status & Investigation</h2>
            <label className="block text-sm text-slate-500 mb-1">Status</label>
            <select
              value={complaint.status}
              onChange={(e) => handleFieldUpdate("status", e.target.value)}
              className="mb-4 px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="open">Open</option>
              <option value="under_investigation">Under investigation</option>
              <option value="pending_capa">Pending CAPA</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>

            <label className="block text-sm text-slate-500 mb-1">Root cause</label>
            <textarea
              key={`root-cause-${complaint.updated_at}`}
              defaultValue={complaint.root_cause || ""}
              onBlur={(e) => handleFieldUpdate("root_cause", e.target.value)}
              rows={3}
              className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-md text-sm"
              placeholder="Document the identified root cause..."
            />

            <label className="block text-sm text-slate-500 mb-1">CAPA notes</label>
            <textarea
              key={`capa-notes-${complaint.updated_at}`}
              defaultValue={complaint.capa_notes || ""}
              onBlur={(e) => handleFieldUpdate("capa_notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              placeholder="Corrective and Preventive Action plan..."
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Attachments</h2>
              <label className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md cursor-pointer">
                {uploading ? "Uploading..." : "+ Upload file"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {complaint.attachments.length === 0 && (
              <p className="text-sm text-slate-400">No files attached yet.</p>
            )}
            <ul className="space-y-2">
              {complaint.attachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-md px-3 py-2">
                  <span>{att.original_filename}</span>
                  <button
                    onClick={() => handleDownload(att.id, att.original_filename)}
                    className="text-brand-600 hover:underline"
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AICopilotPanel
            complaintId={id}
            onApplied={() => dispatch(fetchComplaintById(id))}
          />
        </div>
      </div>
    </div>
  );
}
