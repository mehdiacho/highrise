import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { useState } from 'react';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

export const TopNav = () => {
  const [volumeState, setVolumeState] = useState(true);
  const [showSlider, setShowSlider] = useState(false);
  
  return (
    <div className="top-nav border border-2 border-primary p-2">
      <div className='btn-toolbar justify-content-between' role='toolbar'>
        <div className='btn-group-lg' role='group'>

          
          <button type='button' className={`btn text-white bi bi-volume-${volumeState ? 'up' : 'mute'}`} 
          onClick={() => setVolumeState(!volumeState)} 
          onMouseEnter={() => setShowSlider(true)}
           />

          {showSlider && (
            <div
              className="volume-slider-overlay"
              style={{
                position: "absolute",
                top: "100%", // below the button
                left: 0,
                marginTop: "0px",
                padding: "6px",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                zIndex: 1000,
              }}
              onMouseEnter={() => setShowSlider(true)}   // keep it open if hovered
              onMouseLeave={() => setShowSlider(false)} // hide when leaving
            >
              <input
                type="range"
                min="0"
                max="100"
                value={volumeState}
                onChange={(e) => setVolumeState(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className='btn-group'>
          <button className='btn text-white bi bi-cart3'>
             {` Store`}
          </button>
          
          <button className='btn text-white bi bi-volume-up'>
            {` Login`}
          </button>
        </div>
      </div>
    </div>
  );
}

