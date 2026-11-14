import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GameRoomPage from './pages/GameRoomPage';
//import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './App.css';

function App() {
  return (
    // <Router>
    //   <Routes>
    //     <Route path="/" element={<HomePage />} />
    //     {/* The ':roomId' makes the room ID a variable in the URL */}
    //     <Route path="/room/:roomId" element={<GameRoomPage />} />
    //   </Routes>
    // </Router>
    <div className="app">
      <div className="abs-pos"></div>
      <div className="control"></div>
      <div className="status-modal"></div>
      <div className="main-game">
        <div className="mg-grid">
          <div className="mg-left">
            <div className="left-1">
              <h1 className="title">
                <svg 
                width="441.01" 
                height="74" 
                viewBox="0 0 441 74" 
                xmlns="http://www.w3.org/2000/svg" 
                aria-labelledby="title desc">
                  <title>Monopoly Online Multiplayer Board Game Free Alternative | Richup.io</title>
                  <desc>Play Monopoly Alternative Online with friends for free</desc>
                  <path 
                  d="m65.324 73.654-15.467-26.46A26.781 26.781 0 0 0 31.666.7H.926v72.954H20.09V54.3h11.868l11.284 19.354h22.082ZM20.09 16.844h11.868a10.457 10.457 0 1 1 0 20.915H20.09V16.844Zm49.61 56.81h19.16V.7H69.7v72.954ZM159 11.3A36.091 36.091 0 0 0 133.314.7a36.479 36.479 0 1 0 25.875 62.16l-13.618-13.428a16.709 16.709 0 0 1-12.257 4.868c-9.923 0-17.121-7.2-17.121-17.121s7.2-17.121 17.121-17.121a17.033 17.033 0 0 1 12.257 4.767ZM168.82.7v72.954h19.164V45.832h23.146v27.822h19.164V.7H211.13v25.969h-23.151V.7h-19.164Z" style={{ fill: "rgb(255, 255, 255)", fillRule: "evenodd" }}/>
                  <path d="M259.18.7h-19.26v44.16a28.794 28.794 0 1 0 57.588 0V.7h-19.261v43.868a9.534 9.534 0 0 1-19.067 0V.7Zm67.12 16.144h11.868a10.457 10.457 0 1 1 0 20.915H326.3V16.844Zm-19.164 56.81H326.3V54.3h11.965a26.8 26.8 0 0 0-.392-53.6h-30.74v72.954Z" style={{fill: "rgb(177, 178, 242)", fillRule: "evenodd"}} />
                  <path data-name=".io" d="M360.408 68.527a5.035 5.035 0 1 0 10.066 0 5.033 5.033 0 0 0-10.066 0Zm14.206 5.16h12.55V25.906h-12.55v47.782Zm17.964-23.827a23.859 23.859 0 1 0 23.827-23.954 23.791 23.791 0 0 0-23.827 23.955Zm35.231-.064a11.372 11.372 0 1 1-11.4-11.4 11.433 11.433 0 0 1 11.4 11.404Z" style={{fill: "rgb(107, 99, 164)", fillRule: "evenodd"}} />
                </svg>
              </h1>
              <div className="util-nav">
                <a className="util-link" href="https://discord.gg/r6uJ6bq8ZH" target='_blank' rel='noreferrer noopener'>
                  <svg aria-hidden="true" focusable="false" data-prefix="fab" data-icon="discord" class="svg-inline--fa fa-discord " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                    <path fill="currentColor" d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z" />
                  </svg>
                </a>
                <button className="util-btn">
                  <div className="util-btn-icon">
                    <svg 
                      aria-hidden="true" 
                      focusable="false" 
                      data-prefix="far" 
                      data-icon="circle-question" 
                      class="svg-inline--fa fa-circle-question " 
                      role="img" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 512 512"
                    >
                        <path 
                          fill="currentColor" 
                          d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256s256-114.6 256-256S397.4 0 256 0zM256 464c-114.7 0-208-93.31-208-208S141.3 48 256 48s208 93.31 208 208S370.7 464 256 464zM256 336c-18 0-32 14-32 32s13.1 32 32 32c17.1 0 32-14 32-32S273.1 336 256 336zM289.1 128h-51.1C199 128 168 159 168 198c0 13 11 24 24 24s24-11 24-24C216 186 225.1 176 237.1 176h51.1C301.1 176 312 186 312 198c0 8-4 14.1-11 18.1L244 251C236 256 232 264 232 272V288c0 13 11 24 24 24S280 301 280 288V286l45.1-28c21-13 34-36 34-60C360 159 329 128 289.1 128z" />
                    </svg>
                  </div>
                </button>
                <button className="util-btn">
                  <div className="util-btn-icon">
                    <svg 
                      aria-hidden="true" 
                      focusable="false" 
                      data-prefix="far" 
                      data-icon="volume" 
                      class="svg-inline--fa fa-volume fa-fw fa-lg " 
                      role="img" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 576 512"
                    >
                      <path 
                        fill="currentColor" 
                        d="M333.2 34.84c-4.201-1.896-8.729-2.841-13.16-2.841c-7.697 0-15.29 2.784-21.27 8.1L163.8 160H80c-26.51 0-48 21.49-48 47.1v95.1c0 26.51 21.49 47.1 48 47.1h83.84l134.9 119.9C304.7 477.2 312.3 480 320 480c4.438 0 8.959-.9312 13.16-2.837C344.7 472 352 460.6 352 448V64C352 51.41 344.7 39.1 333.2 34.84zM304 412.4L182.1 304H80v-95.1h102.1L304 99.64V412.4zM444.6 181.9c-4.471-3.629-9.857-5.401-15.2-5.401c-6.949 0-13.83 2.994-18.55 8.807c-8.406 10.25-6.906 25.37 3.375 33.78C425.5 228.4 432 241.8 432 256s-6.5 27.62-17.81 36.87c-10.28 8.406-11.78 23.53-3.375 33.78c4.719 5.812 11.62 8.812 18.56 8.812c5.344 0 10.75-1.781 15.19-5.406C467.1 311.6 480 284.7 480 256C480 227.3 467.1 200.4 444.6 181.9zM505.1 108c-4.455-3.637-9.842-5.417-15.2-5.417c-6.934 0-13.82 2.979-18.58 8.761c-8.406 10.25-6.906 25.37 3.344 33.78C508.6 172.9 528 213.3 528 256c0 42.69-19.44 83.09-53.31 110.9c-10.25 8.406-11.75 23.53-3.344 33.78c4.75 5.781 11.62 8.781 18.56 8.781c5.375 0 10.75-1.781 15.22-5.437C550.2 367.1 576 313.1 576 256C576 198.9 550.2 144.9 505.1 108z" 
                      />
                    </svg>
                  </div>
                </button>
                <button className="util-btn util-btn-last">
                  <div className="util-btn-icon">
                    <svg 
                      aria-hidden="true" 
                      focusable="false" 
                      data-prefix="fas" 
                      data-icon="magnifying-glass-plus" 
                      class="svg-inline--fa fa-magnifying-glass-plus " 
                      role="img" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 512 512"
                    >
                      <path 
                        fill="currentColor" 
                        d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM184 296c0 13.3 10.7 24 24 24s24-10.7 24-24V232h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H232V120c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z" 
                      />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
            <div className="left-2"></div>
            <div className="left-3"></div>
            <div className="left-4"></div>
          </div>
          <div className="mg-center"></div>
          <div className="mg-right"></div>
        </div>
      </div>
      <div className="Toastify"></div>
    </div>
  );
}

export default App;