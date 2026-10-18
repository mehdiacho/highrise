import React from 'react';
import { Link } from 'react-router-dom'; // Use Link for navigation
import {Hero} from '../components/home/Hero';
import {Footer} from '../components/home/Footer';
import {CreateGameForm} from '../components/home/CreateGameForm';
import './HomePage.css';
import {TopNav} from '../components/home/TopNav';




const HomePage = () => {
  return (
    <div className="homepage-container">
      <TopNav />
      <Hero />
      <main className="main-content">
        <CreateGameForm />
            <div className='justify-content-between m-4'>
              <button className='btn btn-indigo btn-lg m-2'>{`All rooms`}</button>
            <button className='btn btn-teal btn-lg m-2'>{`Create A Private Game`}</button>
            </div>
            <div className='d-flex p-2'>
              <input type="text" className=' m-2 form-control  border-indigo' placeholder="Enter Room Code" />
            <button className="join-button m-2">Join</button>
            </div>
            
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;