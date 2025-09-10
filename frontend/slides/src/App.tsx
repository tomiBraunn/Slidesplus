import HomePage from './components/FullScreens/HomePage';
import ProjectPage from './components/FullScreens/ProjectPage';
import LandingPage from './components/FullScreens/LandingPage';
import LogInPage from './components/FullScreens/LogInPage';
import SignUpPage from './components/FullScreens/SignUpPage';
import UrlNotfoundPage from './components/FullScreens/UrlNotfoundPage.tsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import ProtectedRoute from './ProtectedRoute.tsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/login' element={<LogInPage />} />
        <Route path='/signup' element={<SignUpPage />} />
        <Route path='/home' element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path='/p/:id' element={<ProjectPage />} />
        <Route path='/notfound' element={<UrlNotfoundPage />} />
        <Route path='*' element={<Navigate to='/notfound' replace />} />
      </Routes>
    </Router>
  );
}

export default App;
