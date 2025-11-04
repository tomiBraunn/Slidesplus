import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./components/FullScreens/HomePage";
import ProjectPage from "./components/FullScreens/ProjectPage";
import ProjectViewPage from "./components/FullScreens/ProjectViewPage";
import LandingPage from "./components/FullScreens/LandingPage";
import LogInPage from "./components/FullScreens/LogInPage";
import SignUpPage from "./components/FullScreens/SignUpPage";
import AuthCallbackPage from "./components/FullScreens/AuthCallbackPage";
import UrlNotFoundPage from "./components/FullScreens/UrlNotFoundPage";
import ProtectedRoute from "./ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LogInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/p/:id" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
          <Route path="/v/:id" element={<ProjectViewPage />} />
          <Route path="/notfound" element={<UrlNotFoundPage />} />
          <Route path="*" element={<Navigate to="/notfound" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
