import React, { useState, useEffect } from 'react';
import CoachSelect from './components/CoachSelect.jsx';
import GameBoard from './components/GameBoard.jsx';
import Settings from './components/Settings.jsx';
import useChessGame from './hooks/useChessGame.js';

export default function App() {
  const [screen, setScreen] = useState('select'); // select, game, settings
  const [bookmarkedElos, setBookmarkedElos] = useState(() => {
    try {
      const saved = localStorage.getItem('chess-coach-bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('chess-coach-settings');
      return saved ? JSON.parse(saved) : { voiceEnabled: false, boardTheme: 'classic' };
    } catch { return { voiceEnabled: false, boardTheme: 'classic' }; }
  });

  const gameState = useChessGame();

  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem('chess-coach-bookmarks', JSON.stringify(bookmarkedElos));
  }, [bookmarkedElos]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('chess-coach-settings', JSON.stringify(settings));
  }, [settings]);

  const handleStartGame = (coach, elo, color) => {
    gameState.startGame(coach, elo, color);
    setScreen('game');
  };

  const handleBookmarkElo = (elo) => {
    if (!bookmarkedElos.includes(elo)) {
      setBookmarkedElos(prev => [...prev, elo].sort((a, b) => a - b));
    }
  };

  const handleRemoveBookmark = (elo) => {
    setBookmarkedElos(prev => prev.filter(e => e !== elo));
  };

  const handleNewGame = () => {
    setScreen('select');
  };

  return (
    <div className="app">
      {screen === 'select' && (
        <CoachSelect
          onStartGame={handleStartGame}
          bookmarkedElos={bookmarkedElos}
          onBookmarkElo={handleBookmarkElo}
          onRemoveBookmark={handleRemoveBookmark}
          engineReady={gameState.engineReady}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'game' && (
        <GameBoard
          {...gameState}
          settings={settings}
          onNewGame={handleNewGame}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'settings' && (
        <Settings
          settings={settings}
          onUpdateSettings={setSettings}
          onBack={() => setScreen(gameState.gameStatus === 'idle' ? 'select' : 'game')}
        />
      )}
    </div>
  );
}
