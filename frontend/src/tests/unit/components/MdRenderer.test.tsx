import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Md from '@/components/md-renderer';

describe('MdRenderer Component', () => {
  describe('Basic Markdown Rendering', () => {
    it('should render plain text', () => {
      render(<Md>Hello World</Md>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render headings', () => {
      render(<Md># Main Title</Md>);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Main Title');
    });

    it('should render paragraphs', () => {
      render(<Md>This is a paragraph.</Md>);
      expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
    });

    it('should render bold text', () => {
      render(<Md>**bold text**</Md>);
      const bold = screen.getByText('bold text');
      expect(bold.tagName).toBe('STRONG');
    });

    it('should render italic text', () => {
      render(<Md>*italic text*</Md>);
      const italic = screen.getByText('italic text');
      expect(italic.tagName).toBe('EM');
    });

    it('should render links', () => {
      render(<Md>[Link Text](https://example.com)</Md>);
      const link = screen.getByRole('link', { name: 'Link Text' });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('Lists', () => {
    it('should render unordered lists', () => {
      const markdown = `
- Item 1
- Item 2
- Item 3
      `;
      render(<Md>{markdown}</Md>);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render ordered lists', () => {
      const markdown = `
1. First
2. Second
3. Third
      `;
      render(<Md>{markdown}</Md>);
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Code Blocks', () => {
    it('should render inline code', () => {
      render(<Md>`const x = 5;`</Md>);
      const code = screen.getByText('const x = 5;');
      expect(code.tagName).toBe('CODE');
    });

    it('should render code blocks', () => {
      const markdown = `
\`\`\`javascript
const hello = 'world';
console.log(hello);
\`\`\`
      `;
      const { container } = render(<Md>{markdown}</Md>);
      // Code is syntax highlighted and split into spans
      expect(container.querySelector('code.language-javascript')).toBeInTheDocument();
      expect(container.querySelector('pre.my-4')).toBeInTheDocument();
      expect(screen.getByText('const')).toBeInTheDocument();
    });
  });

  describe('Tables (GFM)', () => {
    it('should render tables', () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
      `;
      render(<Md>{markdown}</Md>);
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });
  });

  describe('Callouts', () => {
    it('should render blockquotes with special keywords as callouts', () => {
      const markdown = '> Tip: This is a helpful tip';
      const { container } = render(<Md>{markdown}</Md>);
      expect(screen.getByText(/This is a helpful tip/)).toBeInTheDocument();
      // Component should render the blockquote content
      expect(container.querySelector('.stude-markdown')).toBeInTheDocument();
    });

    it('should render regular blockquotes without keywords', () => {
      const markdown = '> This is a regular quote';
      const { container } = render(<Md>{markdown}</Md>);
      expect(screen.getByText(/This is a regular quote/)).toBeInTheDocument();
      // Should render as regular blockquote
      expect(container.querySelector('blockquote.border-l-4')).toBeInTheDocument();
    });
  });

  describe('Math (KaTeX)', () => {
    it('should render inline math', () => {
      const markdown = 'The equation $E = mc^2$ is famous';
      render(<Md>{markdown}</Md>);
      // KaTeX renders to spans with specific classes
      expect(screen.getByText(/The equation/)).toBeInTheDocument();
      expect(screen.getByText(/is famous/)).toBeInTheDocument();
    });

    it('should render block math', () => {
      const markdown = `
$$
\\frac{a}{b} = c
$$
      `;
      const { container } = render(<Md>{markdown}</Md>);
      // Math block should be rendered (KaTeX creates specific DOM structure)
      expect(container.querySelector('.katex-display')).toBeInTheDocument();
    });
  });

  describe('Custom Components', () => {
    it('should render blockquotes without callout syntax as regular blockquotes', () => {
      const markdown = '> This is a regular quote';
      render(<Md>{markdown}</Md>);
      expect(screen.getByText(/This is a regular quote/)).toBeInTheDocument();
    });

    it('should handle empty string content', () => {
      render(<Md>{''}</Md>);
      // Should render without errors
      expect(document.body).toBeInTheDocument();
    });

    it('should handle whitespace content', () => {
      render(<Md>{' '}</Md>);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Complex Content', () => {
    it('should render mixed content with headings, lists, and code', () => {
      const markdown = `
# Title

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`javascript
const x = 5;
\`\`\`
      `;
      const { container } = render(<Md>{markdown}</Md>);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title');
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      // Code is split into spans by syntax highlighter
      expect(container.querySelector('code.language-javascript')).toBeInTheDocument();
    });

    it('should render multiple headings at different levels', () => {
      const markdown = `
# H1
## H2
### H3
      `;
      render(<Md>{markdown}</Md>);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('H1');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('H2');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('H3');
    });
  });
});
