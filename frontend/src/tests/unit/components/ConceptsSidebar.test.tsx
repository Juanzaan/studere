import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConceptsSidebar } from '@/src/domains/sessions/components/ConceptsSidebar';
import { Concept } from '@/lib/types';

describe('ConceptsSidebar', () => {
  const mockConcepts: Concept[] = [
    { term: 'JavaScript', description: 'A programming language for the web' },
    { term: 'TypeScript', description: 'Typed superset of JavaScript' },
    { term: 'React', description: 'A library for building user interfaces' },
  ];

  it('should render collapsed state', () => {
    const onToggle = vi.fn();
    render(
      <ConceptsSidebar concepts={mockConcepts} isOpen={false} searchQuery="" onToggle={onToggle} />
    );

    expect(screen.getByText('CONCEPTOS')).toBeInTheDocument();
    expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
  });

  it('should render expanded state with concepts', () => {
    const onToggle = vi.fn();
    render(
      <ConceptsSidebar concepts={mockConcepts} isOpen={true} searchQuery="" onToggle={onToggle} />
    );

    expect(screen.getByText('Conceptos Clave')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Count badge
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('should toggle sidebar when clicked', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ConceptsSidebar concepts={mockConcepts} isOpen={false} searchQuery="" onToggle={onToggle} />
    );

    fireEvent.click(screen.getByTitle('Abrir Conceptos Clave'));
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <ConceptsSidebar concepts={mockConcepts} isOpen={true} searchQuery="" onToggle={onToggle} />
    );

    fireEvent.click(screen.getByLabelText('Cerrar conceptos'));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('should highlight search query in concepts', () => {
    render(
      <ConceptsSidebar
        concepts={mockConcepts}
        isOpen={true}
        searchQuery="Type"
        onToggle={vi.fn()}
      />
    );

    const highlights = screen.getAllByText('Type');
    expect(highlights.length).toBeGreaterThan(0);
  });

  it('should show empty state when no concepts', () => {
    render(<ConceptsSidebar concepts={[]} isOpen={true} searchQuery="" onToggle={vi.fn()} />);

    expect(screen.getByText('Sin conceptos que mostrar.')).toBeInTheDocument();
  });
});
