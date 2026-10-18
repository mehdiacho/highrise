import './CreateGameForm.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import PropTypes from 'prop-types';

export const CreateGameForm = ({
    backgroundColor = null,
    ...props
}) => {
    
    return (
        <form className="create-game-form" style={backgroundColor && { backgroundColor }} {...props}>
            <div className="form-options mb-2">
                {/* Add form inputs for game settings here */}
                <input type="text" className="form-control text-bg-dark border-dark" placeholder="Enter Game Name"/>
            </div>
            <a type='button' className="  btn-lg w-100 bi bi-chevron-double-right join-button border-dark" href="/room/newgame" role='button' >
                Start Game
            </a>
        </form>
    );
};

CreateGameForm.propTypes = {
    backgroundColor: PropTypes.string,
}


