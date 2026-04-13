import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/src/store';
import { StudySession } from '@/lib/types';

describe('Zustand Store Integration', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      sessions: [],
    });
    localStorage.clear();
  });

  const mockSession: StudySession = {
    id: 'integration-test-1',
    title: 'Integration Test Session',
    course: 'Testing',
    createdAt: new Date().toISOString(),
    starred: false,
    sourceFileName: 'test.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio',
    templateId: 'class-summary',
    summary: 'Test summary',
    keyConcepts: [],
    flashcards: [],
    quiz: [],
    transcript: [],
    bookmarks: [],
    comments: [],
    insights: [],
    actionItems: [],
    mindMap: { id: 'root', label: 'Test' },
    chatHistory: [],
    stats: {
      wordCount: 100,
      segmentCount: 5,
      estimatedDurationMinutes: 5,
    },
    studyMetrics: {
      completionRate: 0,
      quizAccuracy: 0,
      reviewCount: 0,
    },
  };

  describe('Sessions Management', () => {
    it('should add session to store', () => {
      const { addSession } = useStore.getState();
      addSession(mockSession);

      const sessions = useStore.getState().sessions;
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('integration-test-1');
    });

    it('should update session in store', () => {
      const { addSession, updateSession } = useStore.getState();
      addSession(mockSession);

      updateSession('integration-test-1', { title: 'Updated Title' });

      const sessions = useStore.getState().sessions;
      expect(sessions[0].title).toBe('Updated Title');
    });

    it('should delete session from store', () => {
      const { addSession, deleteSession } = useStore.getState();
      addSession(mockSession);
      expect(useStore.getState().sessions).toHaveLength(1);

      deleteSession('integration-test-1');
      expect(useStore.getState().sessions).toHaveLength(0);
    });

    it('should toggle starred status', () => {
      const { addSession, toggleStarred } = useStore.getState();
      addSession(mockSession);

      toggleStarred('integration-test-1');
      expect(useStore.getState().sessions[0].starred).toBe(true);

      toggleStarred('integration-test-1');
      expect(useStore.getState().sessions[0].starred).toBe(false);
    });

    it('should get session by id', () => {
      const { addSession, getSessionById } = useStore.getState();
      addSession(mockSession);

      const session = getSessionById('integration-test-1');
      expect(session).toBeTruthy();
      expect(session?.id).toBe('integration-test-1');
      expect(session?.title).toBe('Integration Test Session');

      const notFound = getSessionById('non-existent');
      expect(notFound).toBeNull();
    });

    it('should set sessions array', () => {
      const { setSessions } = useStore.getState();
      const sessions = [
        mockSession,
        { ...mockSession, id: 'test-2', title: 'Second Session' },
        { ...mockSession, id: 'test-3', title: 'Third Session' },
      ];

      setSessions(sessions);
      expect(useStore.getState().sessions).toHaveLength(3);
      expect(useStore.getState().sessions[0].id).toBe('integration-test-1');
      expect(useStore.getState().sessions[2].id).toBe('test-3');
    });

    it('should toggle star using toggleStar alias', () => {
      const { addSession, toggleStar } = useStore.getState();
      addSession(mockSession);

      toggleStar('integration-test-1');
      expect(useStore.getState().sessions[0].starred).toBe(true);

      toggleStar('integration-test-1');
      expect(useStore.getState().sessions[0].starred).toBe(false);
    });

    it('should set loading state', () => {
      const { setLoading } = useStore.getState();
      
      expect(useStore.getState().isLoading).toBe(false);
      
      setLoading(true);
      expect(useStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useStore.getState().isLoading).toBe(false);
    });

    it('should set error state', () => {
      const { setError } = useStore.getState();
      
      expect(useStore.getState().error).toBeNull();
      
      setError('Test error message');
      expect(useStore.getState().error).toBe('Test error message');
      
      setError(null);
      expect(useStore.getState().error).toBeNull();
    });
  });

  describe('Persistence', () => {
    it('should persist sessions to localStorage', () => {
      const { addSession } = useStore.getState();
      addSession(mockSession);

      // Check localStorage
      const stored = localStorage.getItem('studere-store');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.state.sessions).toHaveLength(1);
    });

    it('should correctly format data in localStorage for rehydration', () => {
      // Add multiple sessions to test persist format
      const { addSession } = useStore.getState();
      addSession(mockSession);
      addSession({ ...mockSession, id: 'test-2', title: 'Second Session' });

      // Verify localStorage contains properly formatted data
      const stored = localStorage.getItem('studere-store');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      
      // Verify structure matches Zustand persist format
      expect(parsed).toHaveProperty('state');
      expect(parsed).toHaveProperty('version');
      
      // Verify only sessions are persisted (due to partialize)
      expect(parsed.state).toHaveProperty('sessions');
      expect(parsed.state.sessions).toHaveLength(2);
      
      // Verify sessions have correct data (newest first due to addSession implementation)
      expect(parsed.state.sessions[0].id).toBe('test-2');
      expect(parsed.state.sessions[1].id).toBe('integration-test-1');
      
      // Verify UI state is NOT persisted
      expect(parsed.state.sidebarOpen).toBeUndefined();
      expect(parsed.state.activeModal).toBeUndefined();
    });
  });

  describe('UI State', () => {
    it('should toggle sidebar', () => {
      const { toggleSidebar } = useStore.getState();
      
      const initialState = useStore.getState().sidebarOpen;
      toggleSidebar();
      
      expect(useStore.getState().sidebarOpen).toBe(!initialState);
    });

    it('should set sidebar open state', () => {
      const { setSidebarOpen } = useStore.getState();
      
      setSidebarOpen(false);
      expect(useStore.getState().sidebarOpen).toBe(false);
      
      setSidebarOpen(true);
      expect(useStore.getState().sidebarOpen).toBe(true);
    });

    it('should open and close modal', () => {
      const { openModal, closeModal } = useStore.getState();
      
      expect(useStore.getState().activeModal).toBeNull();
      
      openModal('test-modal');
      expect(useStore.getState().activeModal).toBe('test-modal');
      
      openModal('another-modal');
      expect(useStore.getState().activeModal).toBe('another-modal');
      
      closeModal();
      expect(useStore.getState().activeModal).toBeNull();
    });

    it('should add and remove toasts', () => {
      const { addToast, removeToast } = useStore.getState();
      
      expect(useStore.getState().toasts).toHaveLength(0);
      
      addToast('Test toast', 'success');
      let toasts = useStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test toast');
      
      // Remove the toast
      const toastId = toasts[0].id;
      removeToast(toastId);
      
      expect(useStore.getState().toasts).toHaveLength(0);
    });

    it('should show and hide toast', () => {
      const { showToast, hideToast } = useStore.getState();
      
      showToast('Test message', 'success');
      const toast = useStore.getState().toast;
      expect(toast?.message).toBe('Test message');
      expect(toast?.type).toBe('success');

      hideToast();
      expect(useStore.getState().toast).toBeNull();
    });

    it('should handle different toast types', () => {
      const { showToast } = useStore.getState();
      
      showToast('Success message', 'success');
      expect(useStore.getState().toast?.type).toBe('success');
      
      showToast('Error message', 'error');
      expect(useStore.getState().toast?.type).toBe('error');
      
      showToast('Info message', 'info');
      expect(useStore.getState().toast?.type).toBe('info');
    });
  });
});
