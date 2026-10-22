# effort-router

Mod per Claude Code che sceglie da solo il livello di effort (low, medium, high, xhigh, max) per ogni prompt che invii, in base a cosa chiedi.

- **auto** (predefinita): regole locali in italiano e inglese (parole chiave, lunghezza, passaggi numerati, codice/stack trace). Gratis e istantanea.
- **smart**: chiede a Haiku di classificare il prompt (circa 1 secondo in più); se non risponde usa le regole.
- **off**: spento, vale l'effort della sessione.

Comandi: `/effort-router auto | smart | off`, oppure `/effort-router` da solo per vedere lo stato.
Per forzare un singolo prompt, inizialo con `!low`, `!medium`, `!high`, `!xhigh` o `!max` (il prefisso viene tolto prima di mandarlo al modello).

Vale solo per il loop principale: i subagent mantengono il loro effort. La scelta compare nella status line e in una riga sopra il prompt.

## Installazione

Al prompt di una sessione di Claude Code:

```
/plugin install effort-router --marketplace KappaMagna/effort-router
```

Rispondi `y` per aggiungere il marketplace, poi scegli lo scope.

Da una shell:

```
claude plugin install effort-router --marketplace KappaMagna/effort-router
```
