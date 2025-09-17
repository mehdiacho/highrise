import { Link } from 'react-router-dom';
import './CreateGameForm.css';

const CreateGameForm = () => {
    // A Link component that navigates to a new game room
    // The room ID 'newgame' is a placeholder; in a real app,
    // you would generate a unique ID.
    return (
        <div className="create-game-form">
            <h2>Create a New Game</h2>
            <div className="form-options">
                {/* Add form inputs for game settings here */}
            </div>
            <Link to="/room/newgame" className="start-game-button">
                Start Game
            </Link>
        </div>
    );
};

export default CreateGameForm;
