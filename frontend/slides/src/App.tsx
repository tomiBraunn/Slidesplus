import HomePage from './components/FullScreens/HomePage';
import ProjectPage from './components/FullScreens/ProjectPage';
import LandingPage from './components/FullScreens/LandingPage'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/landing' element={<LandingPage />} />
        <Route path='/p' element={<ProjectPage />} />
      </Routes>
    </Router>
  );
}

export default App;
