import React, { useState, useEffect } from 'react';
import { SpeakerWaveIcon, ArrowPathIcon } from './icons';

interface ElevenLabsAudioPlayerProps {
  conversationId: string;
  apiKey: string;
}

const ElevenLabsAudioPlayer: React.FC<ElevenLabsAudioPlayerProps> = ({ conversationId, apiKey }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudio = async () => {
    if (!apiKey || !conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

    } catch (err: any) {
      console.error("Error fetching ElevenLabs audio:", err);
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Automatically fetch audio when component is ready
    fetchAudio();

    // Cleanup object URL on unmount
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [conversationId, apiKey]); // Re-fetch if props change

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
        <span>Loading Audio...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 dark:text-red-400">
        Error loading audio. Please check settings.
      </div>
    );
  }

  if (audioUrl) {
    return (
      <audio controls src={audioUrl} className="w-full h-10" />
    );
  }

  return (
     <button 
        onClick={fetchAudio} 
        className="flex items-center gap-2 py-1 px-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors text-xs"
    >
        <SpeakerWaveIcon className="w-4 h-4"/>
        Load Audio
    </button>
  );
};

export default ElevenLabsAudioPlayer;
