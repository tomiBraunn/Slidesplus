import HomePage from './components/FullScreens/HomePage';
import ProjectPage from './components/FullScreens/ProjectPage';
import LandingPage from './components/FullScreens/LandingPage'
import LogInPage from './components/FullScreens/LogInPage';
import SignUpPage from './components/FullScreens/SignUpPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/login' element={<LogInPage />} />
        <Route path='/signup' element={<SignUpPage />} />
        <Route path='/home' element={<HomePage />} />
        <Route path='/p' element={<ProjectPage />} />
      </Routes>
    </Router>
  );
}

export default App;
