import { expect, test } from 'claude-code/testing'

import { classify, detectLang, readOverride } from './classify'

test('le regole scelgono un livello sensato', async () => {
  expect(classify('ciao!').level).toBe('low')
  expect(classify('correggi il typo nel README').level).toBe('low')
  expect(classify('spiegami che cos’è una closure in JavaScript').level).toBe('medium')
  expect(classify('implementa il login con Google nella pagina contatti').level).toBe('high')
  expect(classify('rifai l’architettura dell’intero progetto da zero e migra a Next.js').level).toBe('xhigh')
  expect(classify('pensa a fondo: rifai l’architettura dell’intero progetto da zero e migra a Next.js').level).toBe('max')
})

test('il prefisso !livello forza la scelta e viene tolto', async () => {
  expect(readOverride('!max rifai tutto')).toEqual({ level: 'max', text: 'rifai tutto' })
  expect(readOverride('!LOW ok')).toEqual({ level: 'low', text: 'ok' })
  expect(readOverride('niente prefisso')).toBe(null)
  expect(readOverride('!turbo no')).toBe(null)
})

test('il turno del loop principale usa l’effort scelto, i subagent no', async ($, on) => {
  const sent: (string | number | undefined)[] = []
  on('command.register', () => ({ value: { command: 'effort-router' } }))
  on('store.get', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.step', async function* (_, e) {
    sent.push(e.effort)

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const entered = await $.prompt.submit({ text: '!max rifai tutto', wait: false, origin: { kind: 'composer' } })
  expect(entered.text).toBe('rifai tutto')

  for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'opus', effort: 'medium', messageCount: 1 }));
  for await (const _ of $.turn.step({ turnId: 't1', index: 1, model: 'opus', effort: 'medium', messageCount: 2, agentId: 'a1' }));
  expect(sent).toEqual(['max', 'medium'])
})

test('i motivi seguono la lingua del prompt', async () => {
  expect(detectLang('rifai la pagina dei contatti con un form che funziona')).toBe('it')
  expect(detectLang('fix the contact form on my page')).toBe('en')
  expect(classify('fix the bug in the contact form').reason).toBe('code work')
  expect(classify('correggi il bug nel form dei contatti').reason).toBe('lavoro sul codice')
  expect(classify('rebuild the whole project from scratch').level).toBe('xhigh')
})
