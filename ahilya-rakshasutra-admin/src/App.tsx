import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LoginPage from "./Pages/LoginPage";
import Dashboard from "./Pages/Dashboard";
import SharePage from "./Pages/SharePage";
import AlertPage from "./Pages/AlertPage";   // <-- add

type RequireAuthProps = { authed: boolean; children: ReactNode };

function RequireAuth({ authed, children }: RequireAuthProps) {
  return authed ? <>{children}</> : <Navigate to="/login" replace />;
}

function Shell() {
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAuthed(!!localStorage.getItem("token"));
    const onStorage = () => setAuthed(!!localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage onAuthed={() => { setAuthed(true); navigate("/", { replace: true }); }} />}
      />
      <Route
        path="/"
        element={
          <RequireAuth authed={authed}>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/share"
        element={
          <RequireAuth authed={authed}>
            <SharePage />
          </RequireAuth>
        }
      />
      <Route
        path="/alert"  // <-- new route for email alerts
        element={
          <RequireAuth authed={authed}>
            <AlertPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
