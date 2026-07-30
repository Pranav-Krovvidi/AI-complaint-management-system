import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../store/slices/authSlice";

export default function Register() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "investigator" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await dispatch(register(form));
    setSubmitting(false);
    if (register.fulfilled.match(result)) {
      navigate("/login");
    } else {
      setError(result.payload || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Create an account</h1>
        <p className="text-sm text-slate-500 mb-6">Register to log and track complaints</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Full name</label>
        <input
          name="full_name"
          required
          value={form.full_name}
          onChange={handleChange}
          className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          name="email"
          required
          value={form.email}
          onChange={handleChange}
          className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          name="password"
          required
          value={form.password}
          onChange={handleChange}
          className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <label className="block text-sm font-medium mb-1">Role</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full mb-6 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="investigator">Investigator</option>
          <option value="qa_manager">QA Manager</option>
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-md font-medium disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
