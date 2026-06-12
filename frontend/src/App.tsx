import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { trackPageView } from "./analytics";
import HomePage from "./components/FullScreens/HomePage";
import ProjectPage from "./components/FullScreens/ProjectPage";
import ProjectViewPage from "./components/FullScreens/ProjectViewPage";
import LandingPage from "./components/FullScreens/LandingPage";
import LogInPage from "./components/FullScreens/LogInPage";
import SignUpPage from "./components/FullScreens/SignUpPage";
import ResetPasswordPage from "./components/FullScreens/ResetPasswordPage";
import AuthCallbackPage from "./components/FullScreens/AuthCallbackPage";
import UrlNotFoundPage from "./components/FullScreens/UrlNotFoundPage";
import ProtectedRoute from "./ProtectedRoute";
import AltLandingPage from "./components/FullScreens/AltLandingPage";
import AltLandingPage2 from "./components/FullScreens/AltLandingPage2";
import { ThemeProvider } from "./contexts/ThemeContext";

// Envía un page_view a GA4 en cada cambio de ruta (necesario en SPAs, donde no
// hay recarga completa entre páginas). No renderiza nada.
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);
  }, [location.pathname, location.search]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <RouteTracker />
        <Routes>
          <Route path="/" element={<AltLandingPage2 />} />
          <Route path="/login" element={<LogInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/p/:id" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
          <Route path="/v/:id" element={<ProjectViewPage />} />
          <Route path="/oldlanding" element={<LandingPage />} />
          <Route path="/altlanding" element={<AltLandingPage />} />
          <Route path="/notfound" element={<UrlNotFoundPage />} />
          <Route path="*" element={<Navigate to="/notfound" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
