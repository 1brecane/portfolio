# Portfolio — Samuele Ruaro

Sito portfolio personale costruito con **Vue 3**, **Vite 6** e **Tailwind CSS v4**.
Un'applicazione single-page che presenta il mio percorso professionale, lo stack tecnologico,
i progetti e l'infrastruttura self-hosted.

## Funzionalità

- **Composition API** con `<script setup>` in tutti i componenti
- **Internazionalizzazione** (italiano / inglese) con sistema i18n custom
- **Form di contatto** integrato tramite EmailJS
- **Animazioni** — effetto typewriter, scroll-reveal, particle network su canvas
- **Design responsive** con Tailwind CSS v4 e tema dark personalizzato
- **Ottimizzazione build** — code splitting, compressione gzip/Brotli, LightningCSS

## Requisiti

- [Node.js](https://nodejs.org/) v18+
- npm v9+

## Installazione

```bash
git clone https://github.com/1brecane/portfolio.git
cd portfolio
npm install
```

Copia il file `.env.example` in `.env` e compila le variabili per il form di contatto:

```bash
cp .env.example .env
```

## Comandi disponibili

| Comando          | Descrizione                            |
| ---------------- | -------------------------------------- |
| `npm run dev`    | Avvia il server di sviluppo            |
| `npm run build`  | Genera la build di produzione          |
| `npm run preview`| Anteprima della build di produzione    |
| `npm run lint`   | Controlla il codice con ESLint         |
| `npm run lint:fix`| Corregge automaticamente gli errori   |
| `npm run format` | Formatta il codice con Prettier        |

## Struttura del progetto

```
src/
├── assets/           # CSS globale e token di design
├── components/       # Componenti Vue (sezioni + UI)
│   └── ui/           # Componenti riutilizzabili (bottoni, badge, layout)
├── composables/      # Logica condivisa (useTypewriter, useScrollReveal)
├── constants/        # Costanti (link social)
├── i18n/             # Traduzioni italiano/inglese
├── App.vue           # Componente root
└── main.js           # Entry point
```

## Stack tecnologico

- **Framework** — Vue 3.5 (Composition API)
- **Build tool** — Vite 6
- **Stile** — Tailwind CSS v4, LightningCSS
- **Icone** — Lucide Vue Next
- **Email** — EmailJS
- **Font** — Geist Sans / Geist Mono
- **Linting** — ESLint + Prettier

## Licenza

Questo progetto è distribuito con licenza MIT.
