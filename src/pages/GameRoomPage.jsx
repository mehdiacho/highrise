import React from 'react';
import { useParams } from 'react-router-dom';
import './GameRoomPage.css';

// Import placeholder components
import Board from '../components/game/Board';
import PlayerList from '../components/game/PlayerList';
import ChatBox from '../components/game/ChatBox';
import ActionPanel from '../components/game/ActionPanel';

const GameRoomPage = () => {
    // Get the room ID from the URL
    const { roomId } = useParams();

    return (
        <div className="gameroom-container">
            <div className="left-panel">
                <PlayerList />
            </div>
            <div className="center-panel">
                <Board />
            </div>
            <div className="right-panel">
                <ChatBox />
                <ActionPanel />
            </div>
        </div>
    );
};

export default GameRoomPage;