import React from 'react';
import { Link } from 'react-router-dom'; // Use Link for navigation
import Header from '../components/home/Header';
import Footer from '../components/home/Footer';
import CreateGameForm from '../components/home/CreateGameForm';
import './HomePage.css';




const HomePage = () => {
  return (
    <div className="homepage-container">
      <Header />
      <main className="main-content">
        <CreateGameForm />
        <div className="join-game-section">
            <input type="text" placeholder="Enter Room Code" />
            <button className="join-button">Join</button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;