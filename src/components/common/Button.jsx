import React from 'react';
import './Button.css';

// A versatile button component
// Props:
// - onClick: The function to call when clicked
// - children: The text or icon inside the button
// - variant: 'primary' (default) or 'secondary'
// - size: 'normal' (default) or 'small'
// - className: Any extra custom classes
const Button = ({ children, onClick, variant = 'primary', size = 'normal', className = '' }) => {
    // Combine classes based on props
    const buttonClass = `
        richup-button 
        ${variant === 'secondary' ? 'richup-button-secondary' : ''}
        ${size === 'small' ? 'richup-button-small' : ''}
        ${className}
    `;

    return (
        <button className={buttonClass.trim()} onClick={onClick}>
            <span className="button-content">{children}</span>
        </button>
    );
};

export default Button;