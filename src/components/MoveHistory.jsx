import React, { useRef, useEffect } from 'react';

export default function MoveHistory({ moveHistory, playerColor }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Group moves into pairs (white, black)
  const movePairs = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1] || null
    });
  }

  return (
    <div className="move-history" ref={scrollRef}>
      <h3>Moves</h3>
      {movePairs.length === 0 ? (
        <p className="no-moves">No moves yet</p>
      ) : (
        <div className="moves-list">
          {movePairs.map((pair) => (
            <div key={pair.number} className="move-pair">
              <span className="move-number">{pair.number}.</span>
              <span className="move-white">{pair.white?.san || ''}</span>
              <span className="move-black">{pair.black?.san || ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
