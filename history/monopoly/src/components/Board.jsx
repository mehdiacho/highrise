import React from 'react';
import './board.css';

const Board = () => {
  return (
    <div className="game-board">
      <div className="center-area">
        <h1>Richup.io</h1>
        {/* You can add card decks or other central elements here */}
      </div>

      <div className="corner go">GO</div>
      <div className="row horizontal top-row">
        <div className="property mediterranean"></div>
        <div className="property community-chest"></div>
        <div className="property baltic"></div>
        <div className="property income-tax"></div>
        <div className="property reading-railroad"></div>
        <div className="property oriental"></div>
        <div className="property chance"></div>
        <div className="property vermont"></div>
        <div className="property connecticut"></div>
      </div>

      <div className="corner jail">JAIL</div>
      <div className="row vertical left-row">
        <div className="property st-charles"></div>
        <div className="property electric-company"></div>
        <div className="property states"></div>
        <div className="property virginia"></div>
        <div className="property penn-railroad"></div>
        <div className="property st-james"></div>
        <div className="property community-chest"></div>
        <div className="property tennessee"></div>
        <div className="property new-york"></div>
      </div>

      <div className="corner free-parking">Free Parking</div>
      <div className="row horizontal bottom-row">
        <div className="property kentucky"></div>
        <div className="property chance"></div>
        <div className="property indiana"></div>
        <div className="property illinois"></div>
        <div className="property bno-railroad"></div>
        <div className="property atlantic"></div>
        <div className="property ventnor"></div>
        <div className="property water-works"></div>
        <div className="property marvin-gardens"></div>
      </div>

      <div className="corner go-to-jail">Go To Jail</div>
      <div className="row vertical right-row">
        <div className="property pacific"></div>
        <div className="property north-carolina"></div>
        <div className="property community-chest"></div>
        <div className="property pennsylvania"></div>
        <div className="property short-line"></div>
        <div className="property chance"></div>
        <div className="property park-place"></div>
        <div className="property luxury-tax"></div>
        <div className="property boardwalk"></div>
      </div>
    </div>
  );
};

export default Board;