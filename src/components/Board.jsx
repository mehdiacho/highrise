
const Board = () => {
  const spaces = [
  { name: "Go", type: "corner" },
  { name: "Camps Bay", type: "property", color: "brown" },
  { name: "Community Chest", type: "chest" },
  { name: "Clifton", type: "property", color: "brown" },
  { name: "Income Tax", type: "tax" },
  { name: "Cape Town Station", type: "station" },
  { name: "Durbanville", type: "property", color: "lightblue" },
  // … continue all 40 lots clockwise
];

  return (
    <div className="board">
      {/* Top row */}
      {spaces.slice(0, 11).map((lot, i) => (
        <div key={i} className={`lot ${lot.type} ${lot.color || ""}`} 
             style={{ gridRow: 1, gridColumn: i + 1 }}>
          {lot.name}
        </div>
      ))}

      {/* Right column */}
      {spaces.slice(11, 20).map((lot, i) => (
        <div key={i+11} className={`lot ${lot.type} ${lot.color || ""}`} 
             style={{ gridRow: i + 2, gridColumn: 11 }}>
          {lot.name}
        </div>
      ))}

      {/* Bottom row */}
      {spaces.slice(20, 31).map((lot, i) => (
        <div key={i+20} className={`lot ${lot.type} ${lot.color || ""}`} 
             style={{ gridRow: 11, gridColumn: 11 - i }}>
          {lot.name}
        </div>
      ))}

      {/* Left column */}
      {spaces.slice(31, 40).map((lot, i) => (
        <div key={i+31} className={`lot ${lot.type} ${lot.color || ""}`} 
             style={{ gridRow: 11 - i, gridColumn: 1 }}>
          {lot.name}
        </div>
      ))}

      {/* Center */}
      <div className="center">
        <h1>MONOPOLY</h1>
        {/* Dice, chat, etc. go here */}
      </div>
    </div>
  );
};

export default Board;
