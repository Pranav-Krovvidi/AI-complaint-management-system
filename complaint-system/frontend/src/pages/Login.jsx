import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../store/slices/authSlice";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Complaint Management System</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to continue</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {typeof error === "string" ? error : "Login failed"}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-md font-medium disabled:opacity-60"
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-sm text-slate-500 mt-4 text-center">
          No account?{" "}
          <Link to="/register" className="text-brand-600 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
