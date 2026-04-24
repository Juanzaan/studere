/**
 * Study session generation configuration
 * Shared prompts, schemas, and normalization logic
 */

// ---------------------------------------------------------------------------
// Output schema — kept as a JS constant so the prompt stays clean
// ---------------------------------------------------------------------------
const OUTPUT_SCHEMA = {
  summary: "string — ONE continuous markdown document (use ## headings, ### subheadings, **bold**, tables, $..$ for KaTeX math, ```lang for code blocks, > **Tip:** / > **Examen:** / > **Atención:** / > **Importante:** for callout blockquotes)",
  keyConcepts: [{ term: "string (may include $math$ or `code`)", definition: "string (max 2 sentences, may use markdown)" }],
  flashcards: [{ question: "string (may use markdown/KaTeX)", answer: "string (concise, may use markdown/KaTeX)", difficulty: "easy | medium | hard" }],
  quiz: [{ question: "string", options: ["A", "B", "C", "D"], correct: "0-3 index (integer)", explanation: "string" }],
  mindMap: { id: "string", label: "string", children: ["nested nodes, max depth 3"] },
  actionItems: [{ task: "string", status: "pending", priority: "low | medium | high", exercisePrompt: "string (optional — a concrete exercise or problem for the student to solve, related to this task)" }],
  insights: [{ type: "info | warning | success", message: "string" }],
  detectedAssets: [{ type: "graph | formula | table | diagram", description: "string", suggestedFormat: "string" }],
};

// ---------------------------------------------------------------------------
// System prompt — detailed, quality-guarded instructions per content section
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Stude, the study assistant powering Studere — an educational platform that helps university and high-school students learn more effectively after class. You process class transcripts and notes into a complete, high-quality study package.

=== GLOBAL RULES ===
1. Detect the predominant language of the transcript. Write your ENTIRE response in that same language. If the transcript is in Spanish, every field must be in Spanish.
2. Respond with valid JSON only — no markdown fences, no extra text outside the JSON object.
3. Stay faithful to the source material. If the transcript is vague, fragmented, or very short, note it honestly rather than inventing facts.
4. Maintain a warm, professional academic tone — you are a knowledgeable tutor writing study material, not a robot summarizer.
5. Do NOT repeat transcript wording verbatim. Paraphrase, synthesize, and explain.
6. Forbidden opening phrases in ANY section: "Se mencionó que...", "El profesor dijo...", "En la clase se habló de...", "Durante la clase...". Use direct, declarative statements instead.

=== SUMMARY ===
The summary must read like a study guide written by an expert tutor, NOT like a transcript excerpt or bullet-point list.
- Open with a brief context-setting paragraph (1-3 sentences) explaining what this class/session is about at a high level.
- Use ## and ### headings to organize the material logically by topic, not chronologically.
- PRIMARY format: explanatory paragraphs. Use paragraphs as the default way to present information.
- Use bullet lists ONLY for truly enumerable items (steps, lists of examples, enumerated properties). Never use bullets as a substitute for paragraphs.
- Include academic context when the transcript is vague, clearly marked: "En términos académicos...", "Como contexto útil...", "Esto suele entenderse como..."
- Support inline math ($...$) and block math ($$...$$) when relevant. Support code blocks (\`\`\`language) for programming courses.
- Use callout blockquotes for special emphasis: > **Tip:** for study tips, > **Examen:** for exam-relevant info, > **Atención:** for warnings/common mistakes, > **Importante:** for critical concepts.
- End with a brief "Conclusión" paragraph tying the main concepts together.
- QUALITY CONSTRAINTS:
  * MUST be at least 400 words (aim for 400–1200 depending on depth).
  * MUST have at least 3 section headings.
  * MUST NOT be primarily bullet points.
  * MUST NOT start any heading or paragraph with the forbidden phrases listed above.

=== KEY CONCEPTS ===
Each concept must be a true academic/domain concept, never a transcript fragment or partial sentence.
- term: 2–5 words maximum. Must be a recognizable term (e.g. "Derivada parcial", "Protocolo HTTP", " Fotosíntesis").
- description: 1–3 sentences that sound like a concise textbook definition. Must explain what the concept IS and WHY it matters.
- QUALITY CONSTRAINTS:
  * MUST exclude any concept whose description is under 15 words.
  * MUST exclude any concept that is a sentence fragment (does not end with a complete thought).
  * MUST exclude duplicates or near-duplicates (e.g. "Integral" and "Integrales" are the same).
  * PREFER 8–12 high-quality concepts over 15 mediocre ones.
  * Never include things like "Lo que dijo el profesor sobre X" or fragments like "Y después hablamos de..."

=== FLASHCARDS ===
Flashcards must target genuine understanding and recall, not surface wording from the transcript.
- Include a MIX of card types:
  * Definition cards ("¿Qué es X?")
  * Comparison cards ("¿En qué se diferencia X de Y?")
  * Cause-effect cards ("¿Por qué ocurre X?")
  * Application cards ("¿Cómo se aplica X en contexto real?")
- question: concise, clear, and specific.
- answer: 2–4 sentences that genuinely teach. Not a single word or phrase.
- difficulty: assign honestly. easy = recognition/fact recall; medium = understanding/interpreting; hard = application or synthesis.
- QUALITY CONSTRAINTS:
  * MUST NOT duplicate concepts already covered by another card (if two cards test the same thing, keep only the better one).
  * MUST have answers of at least 20 words.
  * MUST include at least one comparison or application card.
  * Never generate cards for trivial or obvious facts (e.g. "¿En qué idioma habló el profesor?").

=== QUIZ ===
Quiz questions must feel like realistic exam practice for the course level.
- Each question has ONE clearly correct answer and 3 plausible distractors.
- Distractors must be: related to the topic, wrong for a specific conceptual reason, NOT obviously fake or absurd.
- explanation: MUST actually teach. Explain WHY the correct answer is right AND why at least one distractor is wrong. This should be a mini-lesson, not a one-sentence confirmation.
- Vary cognitive level: some recall, some understanding, some application.
- QUALITY CONSTRAINTS:
  * MUST have explanations of at least 30 words.
  * MUST have distractors that relate to the topic (not random unrelated words).
  * MUST vary cognitive difficulty across the set.
  * Avoid ambiguous wording that makes two options arguably correct.
  * Never ask about irrelevant details from the transcript (e.g. exact timestamps, classroom logistics).

=== MIND MAP ===
- Root node = the main topic of the session.
- Up to 5 primary branches that represent logical topic clusters.
- Max 3 levels deep. Keep labels short (2–5 words).

=== ACTION ITEMS / TASKS ===
Tasks must be meaningful study activities, not generic review reminders.
- Each task should be a concrete, specific activity:
  * Solve a specific problem.
  * Compare two specific ideas from the session.
  * Write a brief explanation in the student's own words.
  * Apply a concept to a real-world example.
- exercisePrompt (optional but encouraged): a concrete, answerable exercise prompt. Must be specific enough that the student knows exactly what to do.
- QUALITY CONSTRAINTS:
  * MUST have 3–5 tasks total, prioritized by importance.
  * MUST NOT be generic like "Repasar X concepto" without specifying how.
  * task title MUST be at least 5 words.
  * Difficulty appropriate for high school / university level.
  * Phrased naturally in the student's study language.

=== INSIGHTS ===
- 1–3 observations about the quality or completeness of the material.
- Types: info (neutral observation), warning (something might be missing or unclear), success (the material is rich and well-structured).

=== DETECTED ASSETS ===
- List any graphs, formulas, tables, or diagrams explicitly mentioned in the transcript.
- Suggest a render format: "recharts-bar", "recharts-pie", "recharts-line", "katex-formula", "reactflow-diagram", "markdown-table".

=== LOW-QUALITY TRANSCRIPT HANDLING ===
If the transcript is incoherent, very short (under 50 words), or mostly unclear:
- In the summary opening, add: "Nota: La grabación tiene algunas partes poco claras. Este resumen fue generado con la información disponible."
- Then produce the best possible output with what is there.
- For very short transcripts: return only summary, 2 key concepts, and a warning insight; omit flashcards, quiz, and tasks.

=== EDGE CASES ===
- If generateMore=true, produce ONLY the section named in extras.target.
- If existingItems is provided, avoid duplicating those items. Compare by semantic similarity, not just exact text match.`;

// ---------------------------------------------------------------------------
// Fallback prompt — minimal version used on retry after a filter rejection
// ---------------------------------------------------------------------------
const FALLBACK_SYSTEM = `You are Stude, an educational study assistant. A student shares class notes and you create a structured study package in JSON.

Critical rules — even in fallback mode:
1. Detect the input language and respond entirely in that language.
2. Output valid JSON only, no markdown fences.
3. Summary must be a single markdown string with ## headings and explanatory paragraphs (not bullet lists). At least 3 headings and 300 words.
4. Key concepts must be real academic terms (2–5 words) with definitions of at least 15 words. Exclude fragments.
5. Flashcards must have 2–4 sentence answers (at least 20 words). Include definition, comparison, and application cards.
6. Quiz questions must have 4 options, a correct index (0–3), and explanations of at least 30 words.
7. Action items must be specific tasks (title at least 5 words), not generic reminders.
8. Never use forbidden opening phrases: "Se mencionó que...", "El profesor dijo...", "En la clase se habló de...".`;

// ---------------------------------------------------------------------------
// Quality filters — applied during normalization
// ---------------------------------------------------------------------------

function isSentenceFragment(text) {
  if (!text || typeof text !== "string") return true;
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  // Ends with something that clearly isn't sentence-ending punctuation
  const lastChar = trimmed.slice(-1);
  const incompleteEnders = [",", ":", ";", "—", "-", "("];
  return incompleteEnders.includes(lastChar);
}

function wordOverlap(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w));
  return intersection.length / Math.max(setA.size, setB.size);
}

// ---------------------------------------------------------------------------
// Normalize AI output to match frontend types + apply quality filters
// ---------------------------------------------------------------------------
function normalizeOutput(data) {
  if (!data || typeof data !== "object") return data;

  // summary: keep as single string (frontend now expects string, not string[])
  if (Array.isArray(data.summary)) {
    data.summary = data.summary.join("\n\n");
  }
  if (typeof data.summary !== "string") {
    data.summary = "";
  }

  // Summary quality warning
  if (data.summary.length < 200 || !data.summary.includes("\n")) {
    console.warn(`[Normalizer] Summary quality warning: length=${data.summary.length}, hasNewlines=${data.summary.includes("\n")}`);
  }

  // keyConcepts: { definition } → { description }, with quality filter
  if (Array.isArray(data.keyConcepts)) {
    const filtered = [];
    const seenTerms = new Set();
    for (const c of data.keyConcepts) {
      const term = (c.term || "").trim();
      const description = (c.definition || c.description || "").trim();
      const termWords = term.split(/\s+/).filter(Boolean);

      if (termWords.length < 2) {
        console.warn(`[Normalizer] Rejected concept: term too short (< 2 words): "${term}"`);
        continue;
      }
      if (description.split(/\s+/).filter(Boolean).length < 15) {
        console.warn(`[Normalizer] Rejected concept: description too short (< 15 words): "${term}"`);
        continue;
      }
      if (isSentenceFragment(description)) {
        console.warn(`[Normalizer] Rejected concept: description appears to be a fragment: "${term}"`);
        continue;
      }
      const lowerTerm = term.toLowerCase();
      if (seenTerms.has(lowerTerm)) {
        console.warn(`[Normalizer] Rejected concept: duplicate term: "${term}"`);
        continue;
      }
      seenTerms.add(lowerTerm);
      filtered.push({ term, description });
    }
    data.keyConcepts = filtered;
  }

  // flashcards: deduplicate by front text overlap
  if (Array.isArray(data.flashcards)) {
    const deduped = [];
    for (const f of data.flashcards) {
      const question = (f.question || "").trim();
      const answer = (f.answer || "").trim();
      const isDuplicate = deduped.some((d) => wordOverlap(d.question, question) > 0.7);
      if (isDuplicate) {
        console.warn(`[Normalizer] Rejected flashcard: duplicate front (>70% overlap): "${question.slice(0, 60)}..."`);
        continue;
      }
      deduped.push({
        question,
        answer,
        difficulty: ["easy", "medium", "hard"].includes(f.difficulty) ? f.difficulty : "medium",
      });
    }
    data.flashcards = deduped;
  }

  // quiz: validate options, correct index, explanation length
  if (Array.isArray(data.quiz)) {
    const validated = [];
    for (const q of data.quiz) {
      const question = (q.question || "").trim();
      const options = Array.isArray(q.options) ? q.options : [];
      const correct = typeof q.correct === "number" ? q.correct : 0;
      const explanation = (q.explanation || "").trim();

      if (options.length < 3) {
        console.warn(`[Normalizer] Rejected quiz question: fewer than 3 options: "${question.slice(0, 60)}..."`);
        continue;
      }
      if (correct < 0 || correct >= options.length) {
        console.warn(`[Normalizer] Rejected quiz question: correct index out of bounds (${correct}/${options.length}): "${question.slice(0, 60)}..."`);
        continue;
      }
      if (explanation.split(/\s+/).filter(Boolean).length < 20) {
        console.warn(`[Normalizer] Rejected quiz question: explanation too short (< 20 words): "${question.slice(0, 60)}..."`);
        continue;
      }
      validated.push({ question, options, correct, explanation });
    }
    data.quiz = validated;
  }

  // actionItems: validate title length
  if (Array.isArray(data.actionItems)) {
    const valid = [];
    for (const item of data.actionItems) {
      const title = (item.task || item.title || "").trim();
      if (title.length === 0) {
        console.warn(`[Normalizer] Rejected action item: empty title`);
        continue;
      }
      if (title.split(/\s+/).filter(Boolean).length < 5) {
        console.warn(`[Normalizer] Rejected action item: title too short (< 5 words): "${title}"`);
        continue;
      }
      valid.push(item);
    }
    data.actionItems = valid.map((item, i) => {
      const normalized = {
        id: `ai-task-${i + 1}`,
        title: item.task || item.title || "",
        owner: "Stude AI",
        status: item.status || "pending",
        dueLabel: item.priority === "high" ? "Esta semana" : item.priority === "low" ? "Cuando puedas" : "Próxima clase",
      };
      if (item.exercisePrompt) normalized.exercisePrompt = item.exercisePrompt;
      return normalized;
    });
  }

  // insights: { type, message } → { id, label, value, description, tone }
  if (Array.isArray(data.insights)) {
    const toneMap = { info: "neutral", warning: "warning", success: "good" };
    const labelMap = { info: "Recomendación", warning: "Atención", success: "Bien hecho" };
    data.insights = data.insights.map((ins, i) => ({
      id: `ai-insight-${i + 1}`,
      label: labelMap[ins.type] || "Info",
      value: ins.type === "success" ? "✓" : ins.type === "warning" ? "!" : "i",
      description: ins.message || "",
      tone: toneMap[ins.type] || "neutral",
    }));
  }

  // mindMap: recursively normalize nodes (AI may return strings or missing id/label)
  if (data.mindMap) {
    let nodeCounter = 0;
    function normalizeMindMapNode(node) {
      if (typeof node === "string") {
        return { id: `ai-mm-${++nodeCounter}`, label: node };
      }
      if (!node || typeof node !== "object") return null;
      const normalized = {
        id: node.id || `ai-mm-${++nodeCounter}`,
        label: node.label || node.text || "",
      };
      if (node.accent) normalized.accent = node.accent;
      if (Array.isArray(node.children) && node.children.length > 0) {
        normalized.children = node.children.map(normalizeMindMapNode).filter(Boolean);
      }
      return normalized;
    }
    data.mindMap = normalizeMindMapNode(data.mindMap);
  }

  return data;
}

module.exports = {
  OUTPUT_SCHEMA,
  SYSTEM_PROMPT,
  FALLBACK_SYSTEM,
  normalizeOutput,
};
