import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Clienti } from "./pages/Clienti";
import { Preventivi } from "./pages/Preventivi";
import { Fatturazione } from "./pages/Fatturazione";
import { Scadenziario } from "./pages/Scadenziario";
import { Progetti } from "./pages/Progetti";
import { Servizi } from "./pages/Servizi";
import { Report } from "./pages/Report";
import { Impostazioni } from "./pages/Impostazioni";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clienti"
        element={
          <ProtectedRoute>
            <Clienti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preventivi"
        element={
          <ProtectedRoute>
            <Preventivi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fatturazione"
        element={
          <ProtectedRoute>
            <Fatturazione />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scadenziario"
        element={
          <ProtectedRoute>
            <Scadenziario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progetti"
        element={
          <ProtectedRoute>
            <Progetti />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servizi"
        element={
          <ProtectedRoute>
            <Servizi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <Report />
          </ProtectedRoute>
        }
      />
      <Route
        path="/impostazioni"
        element={
          <ProtectedRoute>
            <Impostazioni />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
