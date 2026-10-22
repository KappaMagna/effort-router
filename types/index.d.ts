export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** auto: regole locali (gratis, istantaneo); smart: chiede a Haiku; off: spento. */
export type RouterMode = 'auto' | 'smart' | 'off'

export type EffortChoice = {
  level: EffortLevel
  reason: string
  source: 'regole' | 'haiku' | 'manuale'
}

declare module 'claude-code' {
  interface PluginState {
    'effort-router': { mode: RouterMode; choice: EffortChoice | null }
  }
}
