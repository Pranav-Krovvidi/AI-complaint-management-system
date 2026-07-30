import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchDashboardStats } from "../store/slices/complaintSlice";

function StatCard({ label, value, tone = "slate" }) {
  const toneClasses = {
    slate: "text-slate-900",
    blue: "text-brand-600",
    red: "text-red-600",
  };
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${toneClasses[tone]}`}>{value ?? "-"}</p>
    </div>
  );
}

function BreakdownList({ title, data }) {
  const entries = Object.entries(data || {});
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <p className="text-sm font-medium text-slate-700 mb-3">{title}</p>
      {entries.length === 0 && <p className="text-sm text-slate-400">No data yet</p>}
      <ul className="space-y-2">
        {entries.map(([key, count]) => (
          <li key={key} className="flex items-center justify-between text-sm">
            <span className="capitalize text-slate-600">{key.replaceAll("_", " ")}</span>
            <span className="font-medium">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const dashboard = useSelector((state) => state.complaints.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link
          to="/complaints/new"
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Log Complaint
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total complaints" value={dashboard?.total_complaints} />
        <StatCard label="Open / under investigation" value={dashboard?.open_complaints} tone="blue" />
        <StatCard label="Critical severity" value={dashboard?.critical_complaints} tone="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BreakdownList title="By status" data={dashboard?.by_status} />
        <BreakdownList title="By category" data={dashboard?.by_category} />
        <BreakdownList title="By severity" data={dashboard?.by_severity} />
      </div>
    </div>
  );
}
