import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  createTestSession,
  mockGenerationResponse,
  mockTranscriptResponse,
} from './fixtures/session-fixture';
import {
  fileField,
  openComposer,
  stubBackend,
  submitButton,
  titleField,
} from './fixtures/composer';

/**
 * E2E: audio transcription — the two-call pipeline the composer runs when the
 * attached file is audio or video.
 *
 * `session-create-flow.spec.ts` covers the form and `ai-generation-flow.spec.ts`
 * covers the merge; this one covers the step in front of both, `handleSubmit`
 * step 1: transcribe the file, then feed the result to the generator. The
 * handoff is the point — that the text Whisper returned is what arrives in the
 * generation request — because nothing else distinguishes a real transcription
 * from the boilerplate transcript the app invents when it has no text.
 *
 * The previous version guarded every body on `fileInput.isVisible()`. The file
 * input is `sr-only`, so that is false by construction and all five tests were
 * skipped in full. Two of them were also unfixable as written: one asserted a
 * "formato no soportado" message, and there is no format validation anywhere in
 * the composer — `handleFileChange` calls `validateAudioFile`, which keys off
 * size alone and only for files already typed `audio/` or `video/`; the other
 * looked for `[data-testid="session-card"]`, which does not exist in the app.
 * What the composer actually does with a PDF is accept it, and that is what the
 * test below asserts instead.
 */

/** ASCII on purpose: the app base64s it with `btoa`, so Node's encoding matches. */
const AUDIO_BYTES = 'ID3 fake mp3 payload';
const AUDIO_BASE64 = Buffer.from(AUDIO_BYTES, 'ascii').toString('base64');

/** Only there to give the hydration barrier something to wait for. */
const SEED = createTestSession({ id: 'audio-seed', title: 'Sesión previa', course: 'Historia' });

const TRANSCRIBE_URL = '**/api/transcribe-audio';
const GENERATE_URL = '**/api/generate-study-session';

type TranscribeRequest = { audioBase64: string; fileName: string; language: string };
type GenerateRequest = { transcript: string; language: string; summaryFocus: string };

const stubTranscription = (page: Page) =>
  stubBackend<TranscribeRequest, typeof mockTranscriptResponse>(page, TRANSCRIBE_URL, () => ({
    body: mockTranscriptResponse,
  }));

const stubGeneration = (page: Page) =>
  stubBackend<GenerateRequest, typeof mockGenerationResponse>(page, GENERATE_URL, () => ({
    body: mockGenerationResponse,
  }));

/**
 * Attach a file to the composer.
 *
 * Twenty bytes keeps the whole pipeline on the path under test: under 10 MB so
 * `transcribeAudio` stays client-side, under 10 MB again so `chunkAudioFile`
 * returns the original file untouched rather than decoding it through an
 * `AudioContext` — which would fail on bytes that are not really an MP3 — and
 * under 1 MB so `fileToBase64` takes its synchronous branch instead of spawning
 * the Web Worker. A realistic file size would exercise none of it in a browser
 * that cannot decode the fixture.
 */
async function attach(card: Locator, name: string, mimeType: string) {
  await fileField(card).setInputFiles({
    name,
    mimeType,
    buffer: Buffer.from(AUDIO_BYTES, 'ascii'),
  });
  await expect(card.getByText('Archivo listo')).toBeVisible();
}

/** Fill the composer with an audio file and submit it. Returns the card. */
async function composeWithAudio(page: Page, title: string): Promise<Locator> {
  const card = await openComposer(page, SEED);
  await titleField(card).fill(title);
  await attach(card, 'clase.mp3', 'audio/mp3');
  await submitButton(card).click();
  return card;
}

test.describe('Transcripción de audio', () => {
  test('the transcribed text is what reaches the generator', async ({ page }) => {
    const transcribed = await stubTranscription(page);
    const generated = await stubGeneration(page);

    const card = await openComposer(page, SEED);
    await titleField(card).fill('Clase grabada');
    await attach(card, 'clase.mp3', 'audio/mp3');

    // Size, not MIME type, is what the composer classifies on, and the fixture
    // lands in the "small" bucket — the client-side branch this test depends on.
    await expect(card.getByText('Procesamiento rápido en tu navegador')).toBeVisible();
    await expect(submitButton(card)).toHaveText('Crear con IA');

    await submitButton(card).click();
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });

    // The bytes on the wire are the file's own, base64'd — not a placeholder.
    expect(transcribed).toHaveLength(1);
    expect(transcribed[0]).toEqual({
      audioBase64: AUDIO_BASE64,
      fileName: 'clase.mp3',
      language: 'auto',
    });

    // The handoff, and the reason this spec exists. The notes box was never
    // touched, so the only place this string can have come from is the
    // transcription response.
    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({
      transcript: mockTranscriptResponse.text,
      summaryFocus: 'Clase grabada',
    });

    // On screen as well as on the wire: the summary heading is the generated
    // package, and the transcript is the three sentences Whisper returned split
    // into segments — the local fallback would have produced four, and would
    // have named the file instead of describing neuroplasticity.
    const summary = page.getByRole('region', { name: 'Resumen IA' });
    await expect(summary.getByRole('heading', { name: 'Resumen de la Clase' })).toBeVisible();

    await summary.getByRole('button', { name: /^Transcripción/ }).click();
    await expect(summary.getByText('Transcripción (3 bloques)')).toBeVisible();
    await expect(
      summary.getByText('Las sinapsis son las conexiones entre neuronas que permiten la comunicación neuronal.'),
    ).toBeVisible();
  });

  test('the skeleton walks from transcription to generation', async ({ page }) => {
    // Both stubs are held open so each phase is observable instead of being a
    // frame between the click and the redirect.
    let releaseTranscription!: () => void;
    let releaseGeneration!: () => void;
    const transcriptionHeld = new Promise<void>((resolve) => {
      releaseTranscription = resolve;
    });
    const generationHeld = new Promise<void>((resolve) => {
      releaseGeneration = resolve;
    });

    await stubBackend<TranscribeRequest, typeof mockTranscriptResponse>(
      page,
      TRANSCRIBE_URL,
      async () => {
        await transcriptionHeld;
        return { body: mockTranscriptResponse };
      },
    );
    await stubBackend<GenerateRequest, typeof mockGenerationResponse>(
      page,
      GENERATE_URL,
      async () => {
        await generationHeld;
        return { body: mockGenerationResponse };
      },
    );

    const card = await composeWithAudio(page, 'Clase en vuelo');

    // Twice: once as the skeleton's phase heading, once as the progress line
    // `transcribeAudio` reports through `onProgress`. Counting them is the
    // assertion that both are wired, and it is what keeps the locator out of a
    // strict-mode violation.
    await expect(card.getByText('Transcribiendo audio...')).toHaveCount(2);
    await expect(card.getByText('Audio → Transcripción')).toBeVisible();
    await expect(
      card.getByText('Esto puede tardar unos segundos. No cerrés la página.'),
    ).toBeVisible();
    // The skeleton replaces the form outright, so the file cannot be resubmitted
    // while it is being transcribed.
    await expect(submitButton(card)).toBeHidden();

    releaseTranscription();

    await expect(card.getByText('Generando con IA...')).toBeVisible();
    // Down from two: the phase heading moved on, but nothing clears
    // `progressMsg`, so the transcription's last progress line is still sitting
    // under the generation heading. Stale, and visible to the user.
    await expect(card.getByText('Transcribiendo audio...')).toHaveCount(1);

    releaseGeneration();

    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
  });

  test('a failed transcription creates nothing and leaves the composer stuck', async ({ page }) => {
    const transcribed = await stubBackend<TranscribeRequest, { error: string }>(
      page,
      TRANSCRIBE_URL,
      () => ({ status: 500, body: { error: 'Whisper no está disponible' } }),
    );
    const generated = await stubGeneration(page);

    const card = await composeWithAudio(page, 'Clase sin transcribir');

    // Exact, because the message below repeats the title as its own prefix and
    // a substring match would find both.
    await expect(page.getByText('Error al transcribir audio', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Error al transcribir audio: Whisper no está disponible'),
    ).toBeVisible();

    // Unlike a generation failure, which warns and falls back to local content,
    // a transcription failure returns early: no session is built, nothing is
    // generated, and the user stays where they were.
    expect(transcribed).toHaveLength(1);
    expect(generated).toEqual([]);
    await expect(page).toHaveURL(/\/dashboard$/);

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('studere.sessions.v1') ?? '[]'),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(SEED.id);

    // Asserted because it is wrong, not because it is right: the early return
    // resets `isCreating` but never `aiStatus`, so the skeleton it was showing
    // stays on screen with no way back to the form short of a reload. The toast
    // is the only sign anything failed.
    await expect(
      card.getByText('Esto puede tardar unos segundos. No cerrés la página.'),
    ).toBeVisible();
    await expect(submitButton(card)).toBeHidden();
  });

  test('a file the app cannot read is accepted and quietly transcribes nothing', async ({
    page,
  }) => {
    const transcribed = await stubTranscription(page);
    const generated = await stubGeneration(page);

    const card = await openComposer(page, SEED);
    await titleField(card).fill('Apunte en PDF');
    await attach(card, 'apuntes.pdf', 'application/pdf');

    // No size classification, because that only runs for audio and video — and
    // no format complaint either, because nothing validates the format.
    await expect(card.getByText('Procesamiento rápido en tu navegador')).toBeHidden();
    // The button promises AI anyway: the label only asks whether a file is
    // attached, not whether anything can be read out of it.
    await expect(submitButton(card)).toHaveText('Crear con IA');

    await submitButton(card).click();
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });

    // A PDF is neither audio nor readable text, so it is never transcribed and
    // never yields the 30 characters generation needs. Both endpoints stay idle.
    expect(transcribed).toEqual([]);
    expect(generated).toEqual([]);

    // What the session gets instead is `buildFallbackTranscript` — five
    // segments of boilerplate that name the file rather than quote it (four
    // strings, one of which `splitSentences` breaks in two). The session looks
    // complete and contains nothing from the PDF.
    const summary = page.getByRole('region', { name: 'Resumen IA' });
    await summary.getByRole('button', { name: /^Transcripción/ }).click();
    await expect(summary.getByText('Transcripción (5 bloques)')).toBeVisible();
    await expect(summary.getByText(/El archivo apuntes\.pdf quedó asociado/)).toBeVisible();
  });

  test('the transcribed session is listed in the library', async ({ page }) => {
    await stubTranscription(page);
    await stubGeneration(page);

    await composeWithAudio(page, 'Clase archivada');
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });

    await page.goto('/library');
    await expect(
      page.locator('[data-session-row]').filter({ hasText: 'Clase archivada' }),
    ).toBeVisible({ timeout: 60_000 });
  });
});
