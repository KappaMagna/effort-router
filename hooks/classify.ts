import type { EffortChoice, EffortLevel, Lang } from '../types'

export const LEVELS: readonly EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max']

export const isLevel = (value: string): value is EffortLevel =>
  (LEVELS as readonly string[]).includes(value)

type Rule = { label: Record<Lang, string>; pattern: RegExp; points: number }

// Italiano + inglese. I punti di un gruppo si sommano una volta sola per regola.
const RULES: readonly Rule[] = [
  { label: { it: 'banale', en: 'trivial' }, points: -2, pattern: /\b(ciao|grazie|thanks|hello|hi|typo|refuso|rinomina|rename|traduci|translate|formatta|format|ortografia|spelling)\b/ },
  { label: { it: 'chiede velocità', en: 'asks for speed' }, points: -3, pattern: /\b(veloce(mente)?|quick(ly)?|al volo|brevemente|briefly|in breve|risposta breve|short answer|tl;?dr)\b/ },
  { label: { it: 'domanda semplice', en: 'simple question' }, points: 0, pattern: /\b(spiega(mi)?|explain|riassumi|summari[sz]e|che cos|what is|come si)\b/ },
  { label: { it: 'lavoro sul codice', en: 'code work' }, points: 2, pattern: /\b(implementa|implement|costruisci|build|crea(re)?|create|aggiungi|add|scrivi|write|fix|bug|errore|error|debug|refactor\w*|ottimizza|optimi[sz]e|test|integra|integrate|deploy|mod|plugin|hook|api)\b/ },
  { label: { it: 'architettura', en: 'architecture' }, points: 3, pattern: /\b(architettur\w*|architecture|design system|da zero|from scratch|riscrivi tutto|rewrite)\b/ },
  { label: { it: 'migrazione', en: 'migration' }, points: 3, pattern: /\b(migra\w*|migrat\w*|upgrade)\b/ },
  { label: { it: 'ampio raggio', en: 'wide scope' }, points: 3, pattern: /\b(intero (progetto|codebase|repo)|tutto il (progetto|codice|repo)|whole (project|codebase|repo)|end-to-end|e2e|multi-?file)\b/ },
  { label: { it: 'bug difficile', en: 'hard bug' }, points: 3, pattern: /\b(race condition|deadlock|memory leak|concorrenza|concurrency|non riesco a capire|can'?t figure out|intermittent\w*|intermittente)\b/ },
  { label: { it: 'sicurezza/performance', en: 'security/performance' }, points: 3, pattern: /\b(sicurezza|security|vulnerab\w*|performance|scalab\w*)\b/ },
  { label: { it: 'ragionamento', en: 'reasoning' }, points: 3, pattern: /\b(algoritm\w*|algorithm|dimostra|proof|prova matematica|strategi\w*|pianifica|plan|ricerca approfondita|deep research|analisi approfondita|in-depth|confronta|compare)\b/ },
  { label: { it: 'chiede di pensare', en: 'asks to think' }, points: 3, pattern: /\b(pensa (bene|a fondo)|ragiona|think (hard|deeply|carefully)|ultrathink|con attenzione|carefully|passo passo|step by step)\b/ },
]

const ITALIAN = /\b(il|lo|la|gli|le|un|una|che|non|per|con|del|della|nel|questo|questa|sono|fai|puoi|voglio|anche|come|perché|cosa|mi|ti|ci)\b/g
const ENGLISH = /\b(the|a|an|is|are|this|that|with|for|of|to|and|you|can|please|what|how|why|my|it|do|does|i)\b/g

/** Italiano o inglese, dalle parole funzionali più frequenti; in parità vince l'inglese. */
export const detectLang = (text: string): Lang => {
  const lower = text.toLowerCase()
  const it = (lower.match(ITALIAN) ?? []).length + (/[àèéìòù]/.test(lower) ? 1 : 0)
  const en = (lower.match(ENGLISH) ?? []).length

  return it > en ? 'it' : 'en'
}

const EXTRA = {
  long: { it: 'prompt lungo', en: 'long prompt' },
  detailed: { it: 'prompt articolato', en: 'detailed prompt' },
  tiny: { it: 'prompt brevissimo', en: 'very short prompt' },
  code: { it: 'codice/stack trace', en: 'code/stack trace' },
  none: { it: 'nessun segnale', en: 'no signals' },
} as const

const fromScore = (score: number): EffortLevel =>
  score <= -1 ? 'low' : score <= 1 ? 'medium' : score <= 3 ? 'high' : score <= 5 ? 'xhigh' : 'max'

/** Regole locali: nessuna chiamata al modello, nessun costo. */
export const classify = (text: string, lang: Lang = detectLang(text)): EffortChoice => {
  const lower = text.toLowerCase()
  const reasons: string[] = []
  let score = 0
  let heavy = 0

  for (const rule of RULES) {
    if (!rule.pattern.test(lower)) continue
    // Più segnali "pesanti" insieme contano, ma con rendimenti decrescenti.
    const points = rule.points >= 3 && heavy++ > 0 ? 1 : rule.points
    score += points
    reasons.push(rule.label[lang])
  }

  const words = lower.split(/\s+/).filter(Boolean).length
  const steps = (text.match(/^\s*(\d+[.)]|[-*•])\s+/gm) ?? []).length
  const hasCode = /```|Traceback|Exception|\bat .+:\d+|Error:/.test(text)

  if (words > 150) {
    score += 2
    reasons.push(EXTRA.long[lang])
  } else if (words > 60) {
    score += 1
    reasons.push(EXTRA.detailed[lang])
  } else if (words < 6 && score <= 0) {
    score -= 1
    reasons.push(EXTRA.tiny[lang])
  }
  if (steps >= 3) {
    score += 1
    reasons.push(lang === 'it' ? `${steps} passaggi` : `${steps} steps`)
  }
  if (hasCode) {
    score += 1
    reasons.push(EXTRA.code[lang])
  }

  return {
    level: fromScore(score),
    reason: reasons.length > 0 ? reasons.join(', ') : EXTRA.none[lang],
    source: 'rules',
    lang,
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
