import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // ห้ามใช้ plugin-react-swc บน Termux

export default defineConfig({
  plugins: [react()],
  server: {
    // โหมดจริง (VITE_MOCK=0): ส่ง /api/* ต่อไปที่ Rust
    proxy: { "/api": "http://127.0.0.1:8080" },
  },
});
