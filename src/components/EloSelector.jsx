import React, { useState } from 'react';

const ELO_LABELS = {
  100: 'Absolute Beginner',
  300: 'Beginner',
  500: 'Casual',
  800: 'Intermediate',
  1000: 'Club Player',
  1200: 'Experienced',
  1500: 'Advanced',
  1800: 'Expert',
  2200: 'Master',
  2800: 'Grandmaster',
  3000: 'Stockfish Max'
};

function getEloLabel(elo) {
  const breakpoints = Object.keys(ELO_LABELS).map(Number).sort((a, b) => a - b);
  let label = ELO_LABELS[breakpoints[0]];
  for (const bp of breakpoints) {
    if (elo >= bp) label = ELO_LABELS[bp];
  }
  return label;
}

export default function EloSelector({ elo, onChange, bookmarkedElos, onBookmark, onRemoveBookmark }) {
  const [inputValue, setInputValue] = useState(String(elo));

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value);
    onChange(val);
    setInputValue(String(val));
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 100 && val <= 3000) {
      onChange(val);
    }
  };

  const handleInputBlur = () => {
    const val = parseInt(inputValue);
    if (isNaN(val) || val < 100) {
      onChange(100);
      setInputValue('100');
    } else if (val > 3000) {
      onChange(3000);
      setInputValue('3000');
    } else {
      onChange(val);
      setInputValue(String(val));
    }
  };

  const selectBookmark = (belo) => {
    onChange(belo);
    setInputValue(String(belo));
  };

  return (
    <div className="elo-selector">
      <div className="elo-main">
        <div className="elo-slider-row">
          <input
            type="range"
            min="100"
            max="3000"
            step="10"
            value={elo}
            onChange={handleSliderChange}
            className="elo-slider"
          />
        </div>
        <div className="elo-input-row">
          <div className="elo-input-group">
            <label>ELO</label>
            <input
              type="number"
              min="100"
              max="3000"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="elo-input"
            />
          </div>
          <span className="elo-label">{getEloLabel(elo)}</span>
          <button
            className="bookmark-btn"
            onClick={() => onBookmark(elo)}
            title="Bookmark this ELO"
          >
            &#9733; Bookmark ELO
          </button>
        </div>
      </div>

      {bookmarkedElos.length > 0 && (
        <div className="elo-bookmarks">
          <span className="bookmarks-label">Quick Select:</span>
          <div className="bookmark-chips">
            {bookmarkedElos.map(belo => (
              <div key={belo} className="bookmark-chip-group">
                <button
                  className={`bookmark-chip ${belo === elo ? 'active' : ''}`}
                  onClick={() => selectBookmark(belo)}
                >
                  {belo}
                </button>
                <button
                  className="bookmark-remove"
                  onClick={(e) => { e.stopPropagation(); onRemoveBookmark(belo); }}
                  title="Remove bookmark"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
