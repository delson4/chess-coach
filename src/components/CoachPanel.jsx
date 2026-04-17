import React, { useEffect, useRef } from 'react';

// Singleton audio state — only one utterance at a time
let currentAudio = null;

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

// Play TTS audio and wait for it to fully finish
function speakText(text) {
  return new Promise(async (resolve) => {
    try {
      // Cancel anything currently playing
      stopCurrentAudio();

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) { resolve(); return; }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };

      await audio.play();
    } catch (err) {
      console.warn('TTS playback failed:', err.message);
      resolve();
    }
  });
}

export default function CoachPanel({ coach, commentary, isThinking, voiceEnabled }) {
  const scrollRef = useRef(null);
  const lastSpokenRef = useRef(0);
  const processingRef = useRef(false);
  const queueRef = useRef([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commentary]);

  // Process speech queue — mutex via processingRef
  useEffect(() => {
    async function processQueue() {
      if (processingRef.current) return; // Already processing
      processingRef.current = true;

      while (queueRef.current.length > 0) {
        // If multiple entries queued, skip to the latest one
        const text = queueRef.current.length > 1
          ? queueRef.current.splice(0, queueRef.current.length).pop()
          : queueRef.current.shift();

        await speakText(text);
      }

      processingRef.current = false;
    }

    if (!voiceEnabled || commentary.length === 0) return;
    if (commentary.length <= lastSpokenRef.current) return;

    const newEntries = commentary.slice(lastSpokenRef.current);
    lastSpokenRef.current = commentary.length;

    for (const entry of newEntries) {
      queueRef.current.push(entry.text);
    }
    processQueue();
  }, [commentary, voiceEnabled]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      queueRef.current = [];
    };
  }, []);

  if (!coach) return null;

  const latestComment = commentary.length > 0 ? commentary[commentary.length - 1] : null;

  return (
    <div className="coach-panel" style={{ '--coach-color': coach.color }}>
      <div className="coach-header">
        <div className="coach-avatar">
          <span className="coach-avatar-piece">{coach.piece}</span>
        </div>
        <div className="coach-name-plate">
          <span className="coach-panel-name">{coach.name}</span>
          <span className="coach-panel-tagline">{coach.tagline}</span>
        </div>
      </div>

      {latestComment && (
        <div className="speech-bubble">
          <p>{latestComment.text}</p>
          {isThinking && (
            <div className="thinking-text">Thinking...</div>
          )}
        </div>
      )}

      <div className="commentary-history" ref={scrollRef}>
        {commentary.map((c, i) => (
          <div key={i} className={`commentary-entry ${c.type}`}>
            <p>{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
