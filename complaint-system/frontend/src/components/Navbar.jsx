import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../store/slices/authSlice";

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <span className="font-semibold text-brand-700">Complaint Management</span>
        <div className="flex gap-4 text-sm">
          <Link to="/" className="text-slate-600 hover:text-brand-600">
            Dashboard
          </Link>
          <Link to="/complaints" className="text-slate-600 hover:text-brand-600">
            Complaints
          </Link>
          <Link to="/complaints/new" className="text-slate-600 hover:text-brand-600">
            Log Complaint
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {user && <span className="text-slate-500">{user.full_name}</span>}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
