import { Routes, Route, Navigate } from "react-router-dom";
import Store from "./pages/Store.jsx";
import Product from "./pages/Product.jsx";
import AuthForm from "./pages/AuthForm.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";
import WheelPage from "./pages/WheelPage.jsx";
import Security from "./pages/Security.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Store />} />
      <Route path="/product/:id" element={<Product />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/wheel" element={<WheelPage />} />
      <Route path="/security" element={<Security />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
