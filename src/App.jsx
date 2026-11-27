import { Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./pages/AuthForm.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
