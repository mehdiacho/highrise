import React from 'react';
import './PlayerList.css';

// Static player data for demonstration
const players = [
    { id: 1, name: 'Player 1', money: 1500, color: '#f44336' },
    { id: 2, name: 'Player 2', money: 1500, color: '#2196f3' },
    { id: 3, name: 'You', money: 1500, color: '#4caf50', isSelf: true },
    { id: 4, name: 'Player 4', money: 1500, color: '#ffeb3b' },
];

// Sub-component for a single player
const Player = ({ name, money, color, isSelf }) => (
    <div className={`player-card ${isSelf ? 'player-card-self' : ''}`}>
        <div className="player-icon" style={{ backgroundColor: color }}></div>
        <div className="player-info">
            <div className="player-name">{name}</div>
            <div className="player-money">${money}</div>
        </div>
    </div>
);


const PlayerList = () => {
  return (
    <div className="player-list-container">
        <h3>Players</h3>
        <div className="players">
            {players.map(player => <Player key={player.id} {...player} />)}
        </div>
    </div>
  );
};

export default PlayerList;