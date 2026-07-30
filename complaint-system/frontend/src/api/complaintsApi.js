import axiosClient from "./axiosClient";

export const complaintsApi = {
  list: (params) => axiosClient.get("/complaints", { params }),
  get: (id) => axiosClient.get(`/complaints/${id}`),
  create: (payload) => axiosClient.post("/complaints", payload),
  update: (id, payload) => axiosClient.put(`/complaints/${id}`, payload),
  remove: (id) => axiosClient.delete(`/complaints/${id}`),
  dashboard: () => axiosClient.get("/complaints/dashboard"),
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    // Don't set Content-Type manually — the browser needs to add the
    // multipart boundary itself, which axios only does when it detects
    // FormData and this header is left unset.
    return axiosClient.post(`/complaints/${id}/attachments`, formData);
  },
  downloadAttachmentUrl: (attachmentId) =>
    `${axiosClient.defaults.baseURL}/complaints/attachments/${attachmentId}/download`,
  runAiAnalysis: (id) => axiosClient.post(`/complaints/${id}/ai-analysis`),
  applyAiSuggestions: (id, payload) =>
    axiosClient.post(`/complaints/${id}/ai-analysis/apply`, payload),
  extractIntake: ({ text, file }) => {
    const formData = new FormData();
    if (text) formData.append("text", text);
    if (file) formData.append("file", file);
    return axiosClient.post(`/ai/extract-intake`, formData);
  },
};
