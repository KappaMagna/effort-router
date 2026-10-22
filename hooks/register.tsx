import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { EffortChoice, RouterMode } from '../types'
import { HAIKU_SYSTEM, classify, isLevel, readOverride } from './classify'

const COMMAND = 'effort-router'
const MODES: readonly RouterMode[] = ['auto', 'smart', 'off']

const mode = atom({ plugin: 'effort-router', key: 'mode' } as const, 'auto')
const choice = atom({ plugin: 'effort-router', key: 'choice' } as const, null)

const isMode = (value: string): value is RouterMode =>
  (MODES as readonly string[]).includes(value)

const askHaiku = async ($: EngineInterface, text: string): Promise<EffortChoice | null> => {
  const reply = await $.model.complete({
    model: 'haiku',
    system: HAIKU_SYSTEM,
    prompt: text.slice(0, 6000),
    effort: 'low',
    maxTokens: 80,
    timeoutMs: 6000,
  })
  if (!reply.isAnswered) return null

  try {
    const parsed: unknown = JSON.parse(reply.text.slice(reply.text.indexOf('{'), reply.text.lastIndexOf('}') + 1))
    if (typeof parsed !== 'object' || parsed === null) return null
    const { level, reason } = parsed as { level?: unknown; reason?: unknown }

    return typeof level === 'string' && isLevel(level)
      ? { level, reason: typeof reason === 'string' ? reason : 'Haiku', source: 'haiku' }
      : null
  } catch {
    return null
  }
}

const showStatus = ($: EngineInterface, current: RouterMode, picked: EffortChoice | null) =>
  $.ui.status(current === 'off' ? undefined : `⚡ effort ${picked?.level ?? 'default'} · ${current}`)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Effort automatico: auto | smart | off | status',
    })
    const stored = await $.store.get('mode')
    if (typeof stored === 'string' && isMode(stored)) {
      await update($, mode, () => stored)
    }
    showStatus($, await read($, mode), await read($, choice))

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (isMode(arg)) {
      await update($, mode, () => arg)
      await $.store.set('mode', arg)
      if (arg === 'off') await update($, choice, () => null)
      showStatus($, arg, await read($, choice))

      return { text: `Effort router: modalità ${arg}.` }
    }

    const current = await read($, mode)
    const last = await read($, choice)
    const lastLine = last ? `Ultima scelta: ${last.level} (${last.source}: ${last.reason}).` : 'Nessuna scelta ancora.'

    return {
      text: [
        `Effort router: modalità ${current}. ${lastLine}`,
        'Uso: /effort-router auto | smart | off — oppure inizia un prompt con !low, !medium, !high, !xhigh o !max.',
      ].join('\n'),
    }
  })

  on('prompt.submit', async ($, e, next) => {
    // I prompt di sistema e i comandi slash non vengono classificati.
    if (e.isMeta) return next(e)
    if (e.command) {
      await update($, choice, () => null)

      return next(e)
    }

    const current = await read($, mode)
    const override = readOverride(e.text)
    if (current === 'off' && !override) return next(e)

    let picked: EffortChoice
    if (override) {
      picked = { level: override.level, reason: 'scelto da te', source: 'manuale' }
    } else {
      picked = (current === 'smart' ? await askHaiku($, e.text) : null) ?? classify(e.text)
    }

    await update($, choice, () => picked)
    showStatus($, current, picked)

    return next(override ? { ...e, text: override.text } : e)
  })

  // Ogni richiesta al modello del loop principale usa l'effort scelto; i subagent restano come sono.
  on('turn.step', async function* ($, e, next) {
    const picked = e.agentId === undefined && e.effort !== undefined ? await read($, choice) : null

    return yield* next(picked ? { ...e, effort: picked.level } : e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const picked = await read($, choice)
    if (e.props.hasSurvey || picked === null) return next(e)

    const { Text } = $.ui.resolve(e)

    return (
      <Text dimColor>
        ⚡ Effort {picked.level} · {picked.source}: {picked.reason}
      </Text>
    )
  })
}
