/** Pick a friendly emoji for a task based on keywords in its title. */
export function taskEmoji(title: string): string {
  const t = title.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  if (has('essay', 'write', 'paper', 'philosophy', 'journal')) return '📝';
  if (has('read', 'reading', 'literature', 'chapter', 'book', 'novel')) return '📚';
  if (has('cs', 'code', 'program', 'project', 'app', 'dev', 'lab')) return '💻';
  if (has('math', 'calc', 'algebra', 'problem set', 'pset', 'stats')) return '🔢';
  if (has('exam', 'midterm', 'final', 'quiz', 'test', 'study')) return '🧠';
  if (has('bio', 'chem', 'physics', 'science')) return '🔬';
  if (has('present', 'slides', 'deck', 'talk')) return '📊';
  if (has('email', 'apply', 'form', 'admin', 'errand')) return '✅';
  return '✏️';
}
