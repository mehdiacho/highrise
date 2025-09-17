import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GameRoomPage from './pages/GameRoomPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* The ':roomId' makes the room ID a variable in the URL */}
        <Route path="/room/:roomId" element={<GameRoomPage />} />
      </Routes>
    </Router>
  );
}

export default App;