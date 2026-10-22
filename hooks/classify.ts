import type { EffortChoice, EffortLevel } from '../types'

export const LEVELS: readonly EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max']

export const isLevel = (value: string): value is EffortLevel =>
  (LEVELS as readonly string[]).includes(value)

type Rule = { label: string; pattern: RegExp; points: number }

// Italiano + inglese. I punti di un gruppo si sommano una volta sola per regola.
const RULES: readonly Rule[] = [
  { label: 'banale', points: -2, pattern: /\b(ciao|grazie|thanks|hello|hi|typo|refuso|rinomina|rename|traduci|translate|formatta|format|ortografia|spelling)\b/ },
  { label: 'chiede velocità', points: -3, pattern: /\b(veloce(mente)?|quick(ly)?|al volo|brevemente|briefly|in breve|risposta breve|short answer|tl;?dr)\b/ },
  { label: 'domanda semplice', points: 0, pattern: /\b(spiega(mi)?|explain|riassumi|summari[sz]e|che cos|what is|come si)\b/ },
  { label: 'lavoro sul codice', points: 2, pattern: /\b(implementa|implement|costruisci|build|crea(re)?|create|aggiungi|add|scrivi|write|fix|bug|errore|error|debug|refactor\w*|ottimizza|optimi[sz]e|test|integra|integrate|deploy|mod|plugin|hook|api)\b/ },
  { label: 'architettura', points: 3, pattern: /\b(architettur\w*|architecture|design system|da zero|from scratch|riscrivi tutto|rewrite)\b/ },
  { label: 'migrazione', points: 3, pattern: /\b(migra\w*|migrat\w*|upgrade)\b/ },
  { label: 'ampio raggio', points: 3, pattern: /\b(intero (progetto|codebase|repo)|tutto il (progetto|codice|repo)|whole (project|codebase|repo)|end-to-end|e2e|multi-?file)\b/ },
  { label: 'bug difficile', points: 3, pattern: /\b(race condition|deadlock|memory leak|concorrenza|concurrency|non riesco a capire|can'?t figure out|intermittent\w*|intermittente)\b/ },
  { label: 'sicurezza/performance', points: 3, pattern: /\b(sicurezza|security|vulnerab\w*|performance|scalab\w*)\b/ },
  { label: 'ragionamento', points: 3, pattern: /\b(algoritm\w*|algorithm|dimostra|proof|prova matematica|strategi\w*|pianifica|plan|ricerca approfondita|deep research|analisi approfondita|in-depth|confronta|compare)\b/ },
  { label: 'chiede di pensare', points: 3, pattern: /\b(pensa (bene|a fondo)|ragiona|think (hard|deeply|carefully)|ultrathink|con attenzione|carefully|passo passo|step by step)\b/ },
]

const fromScore = (score: number): EffortLevel =>
  score <= -1 ? 'low' : score <= 1 ? 'medium' : score <= 3 ? 'high' : score <= 5 ? 'xhigh' : 'max'

/** Regole locali: nessuna chiamata al modello, nessun costo. */
export const classify = (text: string): EffortChoice => {
  const lower = text.toLowerCase()
  const reasons: string[] = []
  let score = 0
  let heavy = 0

  for (const rule of RULES) {
    if (!rule.pattern.test(lower)) continue
    // Più segnali "pesanti" insieme contano, ma con rendimenti decrescenti.
    const points = rule.points >= 3 && heavy++ > 0 ? 1 : rule.points
    score += points
    reasons.push(rule.label)
  }

  const words = lower.split(/\s+/).filter(Boolean).length
  const steps = (text.match(/^\s*(\d+[.)]|[-*•])\s+/gm) ?? []).length
  const hasCode = /```|Traceback|Exception|\bat .+:\d+|Error:/.test(text)

  if (words > 150) {
    score += 2
    reasons.push('prompt lungo')
  } else if (words > 60) {
    score += 1
    reasons.push('prompt articolato')
  } else if (words < 6 && score <= 0) {
    score -= 1
    reasons.push('prompt brevissimo')
  }
  if (steps >= 3) {
    score += 1
    reasons.push(`${steps} passaggi`)
  }
  if (hasCode) {
    score += 1
    reasons.push('codice/stack trace')
  }

  return {
    level: fromScore(score),
    reason: reasons.length > 0 ? reasons.join(', ') : 'nessun segnale',
    source: 'regole',
  }
}

const OVERRIDE = /^\s*!(low|medium|high|xhigh|max)\b\s*/i

/** `!max rifai tutto` → livello forzato e testo senza il prefisso. */
export const readOverride = (text: string): { level: EffortLevel; text: string } | null => {
  const match = OVERRIDE.exec(text)
  const level = match?.[1]?.toLowerCase() ?? ''

  return match && isLevel(level) ? { level, text: text.slice(match[0].length) } : null
}

export const HAIKU_SYSTEM = `You route coding-assistant prompts to a reasoning effort level.
Levels: low (greetings, trivial edits, quick facts), medium (explanations, small single-file changes),
high (features, debugging, multi-step work), xhigh (multi-file refactors, tricky bugs, design decisions),
max (architecture from scratch, migrations, security/perf audits, proofs, deep research).
Reply with JSON only: {"level":"<level>","reason":"<max 6 words, in the prompt's language>"}`
