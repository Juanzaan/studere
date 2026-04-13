import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusPanelSwitcher } from '@/src/domains/sessions/components/FocusPanelSwitcher';

describe('FocusPanelSwitcher', () => {
  it('should render all panel options', () => {
    render(<FocusPanelSwitcher activePanel="summary" onPanelChange={vi.fn()} />);
    
    expect(screen.getByText('Resumen IA')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('Flashcards')).toBeInTheDocument();
    expect(screen.getByText('Mapa Mental')).toBeInTheDocument();
    expect(screen.getByText('Tareas')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Mis Notas')).toBeInTheDocument();
  });

  it('should highlight active panel', () => {
    render(<FocusPanelSwitcher activePanel="quiz" onPanelChange={vi.fn()} />);
    
    const quizButton = screen.getByText('Quiz').closest('button');
    expect(quizButton).toHaveClass('bg-violet-50', 'text-violet-700');
  });

  it('should call onPanelChange when clicking panel', () => {
    const onPanelChange = vi.fn();
    render(<FocusPanelSwitcher activePanel="summary" onPanelChange={onPanelChange} />);
    
    fireEvent.click(screen.getByText('Flashcards'));
    expect(onPanelChange).toHaveBeenCalledWith('flashcards');
  });

  it('should switch between all panels', () => {
    const onPanelChange = vi.fn();
    render(<FocusPanelSwitcher activePanel="summary" onPanelChange={onPanelChange} />);
    
    const panels = ['Quiz', 'Flashcards', 'Mapa Mental', 'Tareas', 'Insights', 'Mis Notas'];
    panels.forEach((panel) => {
      fireEvent.click(screen.getByText(panel));
    });
    
    expect(onPanelChange).toHaveBeenCalledTimes(6);
  });
});
