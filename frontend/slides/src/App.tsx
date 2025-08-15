import HomePage from './components/FullScreens/HomePage';
import ProjectPage from './components/FullScreens/ProjectPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/project' element={<ProjectPage />} />
      </Routes>
    </Router>
  );
}

export default App;
