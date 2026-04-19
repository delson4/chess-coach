import React from 'react';

export default function Settings({ settings, onUpdateSettings, onBack }) {
  const updateSetting = (key, value) => {
    onUpdateSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="back-btn" onClick={onBack}>&larr; Back</button>
        <h1>Settings</h1>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <h2>Commentary</h2>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-name">Voice Commentary</span>
              <span className="setting-desc">
                {settings.voiceEnabled
                  ? 'Coach speaks aloud using Microsoft Edge neural voice'
                  : 'Commentary shown as text only in the speech bubble'}
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => updateSetting('voiceEnabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {settings.voiceEnabled && (
            <div className="setting-note">
              Uses Microsoft Edge's neural TTS voices via your server. Natural-sounding AI voice,
              completely free, no API key needed. Requires internet on the server.
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>Board Theme</h2>
          <div className="theme-options">
            {['classic', 'green', 'blue', 'wood'].map(theme => (
              <button
                key={theme}
                className={`theme-btn ${settings.boardTheme === theme ? 'active' : ''}`}
                onClick={() => updateSetting('boardTheme', theme)}
              >
                <div className={`theme-preview theme-${theme}`}>
                  <div className="tp-light"></div>
                  <div className="tp-dark"></div>
                </div>
                <span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h2>About</h2>
          <p className="about-text">
            Simple Chess is a self-hosted chess training app powered by Stockfish.
            Play against the engine at any strength from ELO 100 to 3000 while
            getting maximum-strength coaching advice from your chosen chess piece coach.
          </p>
          <p className="version-text">v1.2.7</p>
        </section>
      </div>
    </div>
  );
}
