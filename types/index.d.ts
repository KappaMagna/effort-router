export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** auto: regole locali (gratis, istantaneo); smart: chiede a Haiku; off: spento. */
export type RouterMode = 'auto' | 'smart' | 'off'

/** La lingua dei messaggi del mod: quella dell'ultimo prompt. */
export type Lang = 'it' | 'en'

export type EffortChoice = {
  level: EffortLevel
  reason: string
  source: 'rules' | 'haiku' | 'manual'
  lang: Lang
}

declare module 'claude-code' {
  interface PluginState {
    'effort-router': { mode: RouterMode; choice: EffortChoice | null }
  }
}
