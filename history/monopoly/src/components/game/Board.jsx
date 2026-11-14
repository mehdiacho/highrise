import React from 'react';
import './Board.css';
import { boardData } from './boardData'; // We will create this file next

// A component for a single property space
const PropertySpace = ({ name, type, color, price, orientation }) => {
    // `orientation` will be 'top', 'bottom', 'left', or 'right'
    const classNames = `space property-space richup-block-${orientation}`;

    return (
        <div className={classNames}>
            {color && <div className="header" style={{backgroundColor: color}}></div>}
            <div className="content">
                <div className="name">{name}</div>
                {price && <div className="price">${price}</div>}
            </div>
        </div>
    )
};

// A component for a corner space
const CornerSpace = ({ name, gridArea }) => (
    <div className="space corner-space" style={{ gridArea }}>
        <div className="content">{name}</div>
    </div>
);


const Board = () => {
    // Divide the board data into the four sides
    const bottomRow = boardData.slice(1, 10);
    const leftCol = boardData.slice(11, 20).reverse(); // Reverse for correct order
    const topRow = boardData.slice(21, 30).reverse();
    const rightCol = boardData.slice(31, 40);

    return (
        <div className="board-wrapper">
            <div className="board-grid">
                {/* Render Corners */}
                <CornerSpace name="Go" gridArea="start" />
                <CornerSpace name="Jail" gridArea="prison" />
                <CornerSpace name="Free Parking" gridArea="sleep" />
                <CornerSpace name="Go To Jail" gridArea="gotoprison" />

                {/* Render Rows and Columns */}
                <div className="row bottom-row">
                    {bottomRow.map(space => <PropertySpace key={space.id} {...space} orientation="bottom"/>)}
                </div>
                <div className="col left-col">
                    {leftCol.map(space => <PropertySpace key={space.id} {...space} orientation="left"/>)}
                </div>
                <div className="row top-row">
                    {topRow.map(space => <PropertySpace key={space.id} {...space} orientation="top"/>)}
                </div>
                 <div className="col right-col">
                    {rightCol.map(space => <PropertySpace key={space.id} {...space} orientation="right"/>)}
                </div>

                <div className="center-logo">richup.io</div>
            </div>
        </div>
    );
};

export default Board;