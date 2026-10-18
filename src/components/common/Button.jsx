import React from 'react';
import './Button.css';
import PropTypes from 'prop-types';

// A versatile button component
// Props:
// - onClick: The function to call when clicked
// - children: The text or icon inside the button
// - variant: 'primary' (default) or 'secondary'
// - size: 'normal' (default) or 'small'
// - className: Any extra custom classes
export const Button = ({ 
    children, 
    onClick, 
    variant = 'primary', 
    size = 'medium', 
    bgColor = null,
    type,
    ...props 

}) => {
    // Combine classes based on props
    

    return (
        <button 
        type={type} 
        className={['button', `button-${size}`, `button-${variant}`].join(' ')} 
        onClick={onClick}
        style={bgColor && { backgroundColor: bgColor }}
        {...props}
        >
            {children}
        </button>
    );
};

Button.propTypes = {
    /** Is this the principal call to action on the page? */
    variant: PropTypes.oneOf(['primary', 'secondary']),
    /** What background color to use */
    bgColor: PropTypes.string,
    /** How large should the button be? */
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    /** Button contents */
    children: PropTypes.any.isRequired,
    /** Optional click handler */
    onClick: PropTypes.func,
    /** Optional type of the button */
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
};
