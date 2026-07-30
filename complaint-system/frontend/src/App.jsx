import React from "react";
import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ComplaintList from "./pages/ComplaintList";
import ComplaintDetails from "./pages/ComplaintDetails";
import LogComplaintForm from "./pages/LogComplaintForm";

function AppLayout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}

export default function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ComplaintList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints/new"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LogComplaintForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ComplaintDetails />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          isAuthenticated ? (
            <AppLayout>
              <div>Page not found.</div>
            </AppLayout>
          ) : (
            <Login />
          )
        }
      />
    </Routes>
  );
}
