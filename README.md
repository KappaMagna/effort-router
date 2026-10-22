# effort-router

🇮🇹 [Italiano](#italiano) · 🇬🇧 [English](#english)

## Italiano

Mod per Claude Code che sceglie da solo il livello di effort (low, medium, high, xhigh, max) per ogni prompt che invii, in base a cosa chiedi.

- **auto** (predefinita): regole locali in italiano e inglese (parole chiave, lunghezza, passaggi numerati, codice/stack trace). Gratis e istantanea.
- **smart**: chiede a Haiku di classificare il prompt (circa 1 secondo in più); se non risponde usa le regole.
- **off**: spento, vale l'effort della sessione.

Comandi: `/effort-router auto | smart | off`, oppure `/effort-router` da solo per vedere lo stato.
Per forzare un singolo prompt, inizialo con `!low`, `!medium`, `!high`, `!xhigh` o `!max` (il prefisso viene tolto prima di mandarlo al modello).

Vale solo per il loop principale: i subagent mantengono il loro effort. La scelta compare nella status line e in una riga sopra il prompt.

### Installazione

Al prompt di una sessione di Claude Code:

```
/plugin install effort-router --marketplace KappaMagna/effort-router
```

Rispondi `y` per aggiungere il marketplace, poi scegli lo scope.

Da una shell:

```
claude plugin install effort-router --marketplace KappaMagna/effort-router
```

## English

A Claude Code mod that picks the effort level (low, medium, high, xhigh, max) for every prompt you send, based on what you ask.

- **auto** (default): local rules in English and Italian (keywords, prompt length, numbered steps, code/stack traces). Free and instant.
- **smart**: asks Haiku to classify the prompt (about 1 extra second); falls back to the rules if it doesn't answer.
- **off**: disabled, the session's effort applies.

Commands: `/effort-router auto | smart | off`, or `/effort-router` alone to see the current state.
To force a single prompt, start it with `!low`, `!medium`, `!high`, `!xhigh` or `!max` (the prefix is removed before the prompt reaches the model).

It applies to the main loop only: subagents keep their own effort. The choice shows in the status line and in a line above the prompt (the reason labels are in Italian, e.g. "lavoro sul codice" = code work).

### Installation

At the prompt of a Claude Code session:

```
/plugin install effort-router --marketplace KappaMagna/effort-router
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install effort-router --marketplace KappaMagna/effort-router
```
