import React, { useState } from 'react';
import coaches from '../data/coaches.js';
import EloSelector from './EloSelector.jsx';

export default function CoachSelect({ onStartGame, bookmarkedElos, onBookmarkElo, onRemoveBookmark, engineReady, onOpenSettings }) {
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [elo, setElo] = useState(800);
  const [playerColor, setPlayerColor] = useState('w');

  const handleStart = () => {
    if (!selectedCoach || !engineReady) return;
    const resolvedColor = playerColor === 'random'
      ? (Math.random() > 0.5 ? 'w' : 'b')
      : playerColor;
    onStartGame(selectedCoach, elo, resolvedColor);
  };

  return (
    <div className="coach-select">
      <header className="coach-select-header">
        <h1>Asher's Chess Coach</h1>
        <p className="subtitle">Choose your coach and start playing</p>
        <button className="settings-btn" onClick={onOpenSettings} title="Settings">
          &#9881;
        </button>
      </header>

      <section className="coach-grid-section">
        <h2>Pick Your Coach</h2>
        <div className="coach-grid">
          {coaches.map(coach => (
            <button
              key={coach.id}
              className={`coach-card ${selectedCoach?.id === coach.id ? 'selected' : ''}`}
              onClick={() => setSelectedCoach(coach)}
              style={{ '--coach-color': coach.color }}
            >
              <div className="coach-piece">{coach.piece}</div>
              <div className="coach-info">
                <span className="coach-name">{coach.name}</span>
                <span className="coach-tagline">{coach.tagline}</span>
              </div>
              {selectedCoach?.id === coach.id && (
                <p className="coach-desc">{coach.description}</p>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="game-options">
        <div className="elo-section">
          <h2>Bot Strength</h2>
          <EloSelector
            elo={elo}
            onChange={setElo}
            bookmarkedElos={bookmarkedElos}
            onBookmark={onBookmarkElo}
            onRemoveBookmark={onRemoveBookmark}
          />
        </div>

        <div className="color-section">
          <h2>Play As</h2>
          <div className="color-buttons">
            <button
              className={`color-btn ${playerColor === 'w' ? 'active' : ''}`}
              onClick={() => setPlayerColor('w')}
            >
              <span className="color-piece">&#9812;</span>
              White
            </button>
            <button
              className={`color-btn ${playerColor === 'random' ? 'active' : ''}`}
              onClick={() => setPlayerColor('random')}
            >
              <span className="color-piece">&#10070;</span>
              Random
            </button>
            <button
              className={`color-btn ${playerColor === 'b' ? 'active' : ''}`}
              onClick={() => setPlayerColor('b')}
            >
              <span className="color-piece">&#9818;</span>
              Black
            </button>
          </div>
        </div>
      </section>

      <button
        className="start-btn"
        onClick={handleStart}
        disabled={!selectedCoach || !engineReady}
      >
        {!engineReady ? 'Loading Engine...' : !selectedCoach ? 'Select a Coach' : `Play with ${selectedCoach.name}`}
      </button>

      {!engineReady && (
        <p className="engine-status">Loading Stockfish engine... This may take a moment.</p>
      )}
    </div>
  );
}
