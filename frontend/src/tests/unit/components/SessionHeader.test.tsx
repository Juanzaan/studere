import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionHeader } from '@/src/domains/sessions/components/SessionHeader';
import { StudySession } from '@/lib/types';

describe('SessionHeader', () => {
  const mockSession: StudySession = {
    id: 'test-123',
    title: 'Test Session',
    course: 'Test Course',
    sourceFileName: 'test.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio',
    templateId: 'class-summary',
    createdAt: new Date().toISOString(),
    starred: false,
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

  it('should render session title and metadata', () => {
    const onToggleStarred = vi.fn();
    const onExportMd = vi.fn();
    const onExportCsv = vi.fn();
    const onDeleteClick = vi.fn();
    const onDeleteConfirm = vi.fn();
    const onDeleteCancel = vi.fn();

    render(
      <SessionHeader
        session={mockSession}
        starred={false}
        confirmDelete={false}
        onToggleStarred={onToggleStarred}
        onExportMd={onExportMd}
        onExportCsv={onExportCsv}
        onDeleteClick={onDeleteClick}
        onDeleteConfirm={onDeleteConfirm}
        onDeleteCancel={onDeleteCancel}
      />
    );

    expect(screen.getByText('Test Session')).toBeInTheDocument();
    expect(screen.getByText(/Test Course/)).toBeInTheDocument();
    expect(screen.getByText(/test.mp3/)).toBeInTheDocument();
  });

  it('should toggle starred state', () => {
    const onToggleStarred = vi.fn();

    const { rerender } = render(
      <SessionHeader
        session={mockSession}
        starred={false}
        confirmDelete={false}
        onToggleStarred={onToggleStarred}
        onExportMd={vi.fn()}
        onExportCsv={vi.fn()}
        onDeleteClick={vi.fn()}
        onDeleteConfirm={vi.fn()}
        onDeleteCancel={vi.fn()}
      />
    );

    const starButton = screen.getByText('Marcar como importante');
    fireEvent.click(starButton);
    expect(onToggleStarred).toHaveBeenCalledTimes(1);

    rerender(
      <SessionHeader
        session={mockSession}
        starred={true}
        confirmDelete={false}
        onToggleStarred={onToggleStarred}
        onExportMd={vi.fn()}
        onExportCsv={vi.fn()}
        onDeleteClick={vi.fn()}
        onDeleteConfirm={vi.fn()}
        onDeleteCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Destacada')).toBeInTheDocument();
  });

  it('should call export handlers', () => {
    const onExportMd = vi.fn();
    const onExportCsv = vi.fn();

    render(
      <SessionHeader
        session={mockSession}
        starred={false}
        confirmDelete={false}
        onToggleStarred={vi.fn()}
        onExportMd={onExportMd}
        onExportCsv={onExportCsv}
        onDeleteClick={vi.fn()}
        onDeleteConfirm={vi.fn()}
        onDeleteCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Markdown'));
    expect(onExportMd).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('CSV'));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
  });

  it('should show delete confirmation flow', () => {
    const onDeleteClick = vi.fn();
    const onDeleteConfirm = vi.fn();
    const onDeleteCancel = vi.fn();

    const { rerender } = render(
      <SessionHeader
        session={mockSession}
        starred={false}
        confirmDelete={false}
        onToggleStarred={vi.fn()}
        onExportMd={vi.fn()}
        onExportCsv={vi.fn()}
        onDeleteClick={onDeleteClick}
        onDeleteConfirm={onDeleteConfirm}
        onDeleteCancel={onDeleteCancel}
      />
    );

    fireEvent.click(screen.getByText('Eliminar'));
    expect(onDeleteClick).toHaveBeenCalledTimes(1);

    rerender(
      <SessionHeader
        session={mockSession}
        starred={false}
        confirmDelete={true}
        onToggleStarred={vi.fn()}
        onExportMd={vi.fn()}
        onExportCsv={vi.fn()}
        onDeleteClick={onDeleteClick}
        onDeleteConfirm={onDeleteConfirm}
        onDeleteCancel={onDeleteCancel}
      />
    );

    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirmar'));
    expect(onDeleteConfirm).toHaveBeenCalledTimes(1);
  });

  it('should display stats correctly', () => {
    render(
      <SessionHeader
        session={mockSession}
        starred={false}
        confirmDelete={false}
        onToggleStarred={vi.fn()}
        onExportMd={vi.fn()}
        onExportCsv={vi.fn()}
        onDeleteClick={vi.fn()}
        onDeleteConfirm={vi.fn()}
        onDeleteCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/5 min/)).toBeInTheDocument();
    expect(screen.getByText(/100 palabras/)).toBeInTheDocument();
  });
});
