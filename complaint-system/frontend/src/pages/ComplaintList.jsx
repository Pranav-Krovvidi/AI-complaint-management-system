import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchComplaints, setFilters, setPage } from "../store/slices/complaintSlice";
import Badge from "../components/Badge";

const STATUS_OPTIONS = ["", "open", "under_investigation", "pending_capa", "closed", "rejected"];
const CATEGORY_OPTIONS = ["", "product_quality", "packaging", "adverse_event", "labeling", "delivery_logistics", "other"];
const SEVERITY_OPTIONS = ["", "low", "medium", "high", "critical"];

export default function ComplaintList() {
  const dispatch = useDispatch();
  const { items, total, page, pageSize, filters, listStatus } = useSelector((state) => state.complaints);

  useEffect(() => {
    dispatch(
      fetchComplaints({
        page,
        page_size: pageSize,
        status: filters.status || undefined,
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        search: filters.search || undefined,
      })
    );
  }, [dispatch, page, pageSize, filters]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Complaints</h1>
        <Link
          to="/complaints/new"
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Log Complaint
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Search product, complaint #, description..."
          defaultValue={filters.search}
          onKeyDown={(e) => {
            if (e.key === "Enter") dispatch(setFilters({ search: e.target.value }));
          }}
          className="flex-1 min-w-[220px] px-3 py-2 border border-slate-300 rounded-md text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => dispatch(setFilters({ status: e.target.value }))}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? s.replaceAll("_", " ") : "All statuses"}
            </option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => dispatch(setFilters({ category: e.target.value }))}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c ? c.replaceAll("_", " ") : "All categories"}
            </option>
          ))}
        </select>
        <select
          value={filters.severity}
          onChange={(e) => dispatch(setFilters({ severity: e.target.value }))}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm"
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? s.replaceAll("_", " ") : "All severities"}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3">Complaint #</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {listStatus === "loading" && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {listStatus === "succeeded" && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No complaints match these filters.
                </td>
              </tr>
            )}
            {items.map((c) => (
              <tr
                key={c.id}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => (window.location.href = `/complaints/${c.id}`)}
              >
                <td className="px-4 py-3 font-medium text-brand-700">{c.complaint_number}</td>
                <td className="px-4 py-3">{c.product_name}</td>
                <td className="px-4 py-3 capitalize">{c.category.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">
                  <Badge value={c.severity} />
                </td>
                <td className="px-4 py-3">
                  <Badge value={c.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => dispatch(setPage(page - 1))}
            className="px-3 py-1.5 border border-slate-300 rounded-md disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => dispatch(setPage(page + 1))}
            className="px-3 py-1.5 border border-slate-300 rounded-md disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
