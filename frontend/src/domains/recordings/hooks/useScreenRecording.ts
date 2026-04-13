import { useState, useCallback, useRef } from 'react';
import { startScreenCapture, stopScreenCapture } from '@/lib/screen-capture';

export type ScreenRecordingState = 'idle' | 'recording' | 'processing';

export interface UseScreenRecordingReturn {
  state: ScreenRecordingState;
  videoBlob: Blob | null;
  duration: number;
  error: string | null;
  
  // Actions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

export function useScreenRecording(): UseScreenRecordingReturn {
  const [state, setState] = useState<ScreenRecordingState>('idle');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(async () => {
    try {
      setError(null);
      setState('processing');
      
      await startScreenCapture();
      
      setState('recording');
      startTimeRef.current = Date.now();
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start screen recording');
      setState('idle');
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      setState('processing');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const result = await stopScreenCapture();
      setVideoBlob(result.blob);
      setState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setState('idle');
    }
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setState('idle');
    setVideoBlob(null);
    setDuration(0);
    setError(null);
    startTimeRef.current = 0;
  }, []);

  return {
    state,
    videoBlob,
    duration,
    error,
    start,
    stop,
    reset,
  };
}
