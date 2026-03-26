import type { Note } from '../types';

export const SYSTEM_BASE = `You are an AI assistant helping a learner understand educational video content.
The learner has provided their timestamped notes taken while watching the video.
Be concise, clear, and pedagogically helpful. Respond in plain text (no markdown headers unless generating a quiz).`;

function notesBlock(notes: Note[]): string {
  if (!notes.length) return 'No notes taken yet.';
  return notes
    .map((n) => `[${formatTime(n.timestamp)}] ${n.content}`)
    .join('\n');
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function summaryPrompt(title: string, description: string | null, notes: Note[]): string {
  return `Video: "${title}"${description ? `\nDescription: ${description}` : ''}

Learner's notes:
${notesBlock(notes)}

Write a comprehensive summary of the key ideas covered in this video based on the notes above.
Group related ideas together. Keep it focused and actionable for the learner.`;
}

export function conceptsPrompt(title: string, notes: Note[]): string {
  return `Video: "${title}"

Learner's notes:
${notesBlock(notes)}

Extract the 5–10 most important concepts, terms, or ideas from these notes.
For each, give:
- The concept name (bold it with **name**)
- One sentence explaining it in simple terms`;
}

export function quizPrompt(title: string, notes: Note[]): string {
  return `Video: "${title}"

Learner's notes:
${notesBlock(notes)}

Generate 5 multiple-choice quiz questions that test understanding of the material in these notes.
Format each question EXACTLY as valid JSON inside a JSON array, like this:

[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A) ..."
  }
]

Output ONLY the JSON array, no other text.`;
}

export function chatPrompt(
  title: string,
  notes: Note[],
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string
): { system: string; prompt: string } {
  const context = `Video: "${title}"\n\nLearner's notes:\n${notesBlock(notes)}`;
  const historyText = history
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Assistant'}: ${m.content}`)
    .join('\n');

  return {
    system: `${SYSTEM_BASE}\n\nContext:\n${context}`,
    prompt: historyText ? `${historyText}\nLearner: ${userMessage}` : userMessage,
  };
}
