import { useState, useCallback, useRef } from 'react';
import { startAudioCapture, stopAudioCapture } from '@/lib/audio-capture';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

export interface UseAudioRecordingReturn {
  state: RecordingState;
  audioBlob: Blob | null;
  duration: number;
  isPaused: boolean;
  error: string | null;
  
  // Actions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const start = useCallback(async () => {
    try {
      setError(null);
      setState('processing');
      
      await startAudioCapture();
      
      setState('recording');
      setIsPaused(false);
      startTimeRef.current = Date.now();
      
      // Start timer
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          setDuration(Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000));
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setState('idle');
    }
  }, [isPaused]);

  const stop = useCallback(async () => {
    try {
      setState('processing');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const result = await stopAudioCapture();
      setAudioBlob(result.blob);
      setState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setState('idle');
    }
  }, []);

  const pause = useCallback(() => {
    if (state !== 'recording' || isPaused) return;
    // Note: audio-capture doesn't support pause natively
    // This is a UI-only pause for future implementation
    setIsPaused(true);
    pausedTimeRef.current = Date.now();
  }, [state, isPaused]);

  const resume = useCallback(() => {
    if (state !== 'recording' || !isPaused) return;
    // Note: audio-capture doesn't support resume natively
    setIsPaused(false);
    const pauseDuration = Date.now() - pausedTimeRef.current;
    pausedTimeRef.current += pauseDuration;
  }, [state, isPaused]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setState('idle');
    setAudioBlob(null);
    setDuration(0);
    setIsPaused(false);
    setError(null);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, []);

  return {
    state,
    audioBlob,
    duration,
    isPaused,
    error,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}
