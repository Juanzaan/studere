import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightsPanel } from '@/src/domains/sessions/components/InsightsPanel';
import { SessionInsight } from '@/lib/types';

describe('InsightsPanel', () => {
  const mockInsights: SessionInsight[] = [
    {
      id: 'coverage',
      label: 'Cobertura',
      value: '5 bloques',
      description: 'Cantidad de bloques detectados en el transcript',
      tone: 'good',
    },
    {
      id: 'concepts',
      label: 'Conceptos',
      value: '3 clave',
      description: 'Términos útiles para memoria activa',
      tone: 'neutral',
    },
    {
      id: 'accuracy',
      label: 'Precisión',
      value: '45%',
      description: 'Resultado del quiz',
      tone: 'warning',
    },
  ];

  it('should render empty state when no insights', () => {
    render(<InsightsPanel insights={[]} />);
    expect(screen.getByText('Sin insights para esta sesión.')).toBeInTheDocument();
  });

  it('should render all insights', () => {
    render(<InsightsPanel insights={mockInsights} />);
    
    expect(screen.getByText('Cobertura')).toBeInTheDocument();
    expect(screen.getByText('5 bloques')).toBeInTheDocument();
    expect(screen.getByText('Conceptos')).toBeInTheDocument();
    expect(screen.getByText('3 clave')).toBeInTheDocument();
  });

  it('should apply correct tone styling', () => {
    const { container } = render(<InsightsPanel insights={mockInsights} />);
    
    // Good tone should have emerald styling
    const goodBadge = screen.getByText('5 bloques');
    expect(goodBadge).toHaveClass('bg-emerald-100', 'text-emerald-700');
    
    // Warning tone should have amber styling
    const warningBadge = screen.getByText('45%');
    expect(warningBadge).toHaveClass('bg-amber-100', 'text-amber-700');
    
    // Neutral tone should have slate styling
    const neutralBadge = screen.getByText('3 clave');
    expect(neutralBadge).toHaveClass('bg-slate-100', 'text-slate-600');
  });
});
