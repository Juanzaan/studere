import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthCard } from '@/components/auth/auth-card';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const signUp = { create: vi.fn(), prepareEmailAddressVerification: vi.fn() };
const signIn = { create: vi.fn() };

vi.mock('@clerk/nextjs', () => ({
  useSignUp: () => ({ isLoaded: true, signUp, setActive: vi.fn() }),
  useSignIn: () => ({ isLoaded: true, signIn, setActive: vi.fn() }),
}));

/** The deadline in auth-card.tsx; kept local so the test fails loudly if it moves. */
const TIMEOUT_MS = 25_000;
const TIMEOUT_COPY = /El servicio de autenticación no respondió/;

/** A promise that never settles — what clerk-js does while it waits on captcha. */
const hangs = () => new Promise(() => {});

function fillSignUp() {
  fireEvent.change(document.querySelector('#suEmail')!, {
    target: { value: 'ana@universidad.edu' },
  });
  fireEvent.change(document.querySelector('#suPass')!, {
    target: { value: 'contrasena-larga' },
  });
}

function submitSignUp() {
  fireEvent.click(screen.getByRole('button', { name: /Empezar trial/ }));
}

/** Advance past the deadline and let the rejection propagate through React. */
async function passDeadline() {
  await act(async () => {
    vi.advanceTimersByTime(TIMEOUT_MS);
  });
}

describe('AuthCard — stuck Clerk requests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockClear();
    signUp.create.mockReset();
    signUp.prepareEmailAddressVerification.mockReset();
    signIn.create.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('surfaces an actionable message when signUp.create never settles', async () => {
    signUp.create.mockImplementation(hangs);
    render(<AuthCard initialMode="signup" />);

    fillSignUp();
    submitSignUp();

    // Mid-flight: spinner on, no message yet.
    expect(screen.getByRole('button', { name: /Empezar trial/ })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await passDeadline();

    expect(screen.getByRole('status')).toHaveTextContent(TIMEOUT_COPY);
  });

  it('releases the submit button so the user can retry', async () => {
    signUp.create.mockImplementation(hangs);
    render(<AuthCard initialMode="signup" />);

    fillSignUp();
    submitSignUp();
    await passDeadline();

    const button = screen.getByRole('button', { name: /Empezar trial/ });
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).not.toBeDisabled();

    // The retry actually reaches Clerk rather than being swallowed by a stale lock.
    submitSignUp();
    expect(signUp.create).toHaveBeenCalledTimes(2);
  });

  it('times out the verification step too, not just the first call', async () => {
    signUp.create.mockResolvedValue({ status: 'missing_requirements' });
    signUp.prepareEmailAddressVerification.mockImplementation(hangs);
    render(<AuthCard initialMode="signup" />);

    fillSignUp();
    await act(async () => {
      submitSignUp();
    });
    await passDeadline();

    expect(screen.getByRole('status')).toHaveTextContent(TIMEOUT_COPY);
    // Every panel stays mounted, so "did we advance?" is about which one is active.
    expect(document.querySelector('#panel-verify')).toHaveAttribute(
      'data-panel-active',
      'false',
    );
  });

  it('reports a stuck sign-in without navigating away', async () => {
    signIn.create.mockImplementation(hangs);
    render(<AuthCard initialMode="login" />);

    fireEvent.change(document.querySelector('#liEmail')!, {
      target: { value: 'ana@universidad.edu' },
    });
    fireEvent.change(document.querySelector('#liPass')!, {
      target: { value: 'contrasena-larga' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Entrar a Studere/ }));
    await passDeadline();

    expect(screen.getByRole('status')).toHaveTextContent(TIMEOUT_COPY);
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps a real Clerk error message instead of replacing it at the deadline', async () => {
    signUp.create.mockRejectedValue(new Error('boom'));
    render(<AuthCard initialMode="signup" />);

    fillSignUp();
    await act(async () => {
      submitSignUp();
    });

    const shown = screen.getByRole('status').textContent;
    expect(shown).not.toMatch(TIMEOUT_COPY);

    // The timer must have been cleared on rejection, so waiting changes nothing.
    await passDeadline();
    expect(screen.getByRole('status').textContent).toBe(shown);
  });
});
