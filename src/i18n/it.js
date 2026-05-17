export default {
  nav: {
    home: "Home",
    about: "Chi sono",
    stack: "Stack",
    projects: "Progetti",
    homelab: "Home Lab",
    contact: "Contatti",
  },
  hero: {
    terminal: [
      "$ whoami",
      "samuele_ruaro",
      "$ cat ./about.txt",
      "Sviluppatore backend & appassionato di self-hosting.",
      "Costruisco sistemi scalabili, un commit alla volta.",
      "$ _",
    ],
    headline: "Dal Codice alla",
    headlineHighlight: "Produzione",
    headlineEnd: "",
    subheadline:
      "Sono Samuele Ruaro -- uno sviluppatore backend che costruisce sistemi enterprise, infrastrutture self-hosted e API scalabili. Dai cluster Proxmox ai servizi Node.js in produzione, trasformo problemi complessi in soluzioni pulite e manutenibili.",
    viewProjects: "Vedi Progetti",
    downloadCv: "Scarica CV",
  },
  stack: {
    title: "Tech Stack",
    subtitle:
      "Gli strumenti e le tecnologie che utilizzo per costruire sistemi backend robusti e scalabili.",
    categories: {
      languages: "Linguaggi, Framework & Strumenti",
      databases: "Database & Cache",
      devops: "DevOps & Infrastruttura",
      selfhosting: "Self-Hosting",
    },
    items: {
      javascript: "Node.js & Fastify",
      rust: "Sistemi backend ad alte prestazioni",
      csharp: "Ecosistema .NET",
      php: "Laravel",
      vue: "Sperimentazione frontend",
      cursorAi: "Sviluppo software assistito da Intelligenza Artificiale",
      mysql: "DB relazionale",
      mongodb: "Gestione documenti BSON",
      redis: "Cache & In-memory data store",
      postgresql: "DB relazionale avanzato",
      valkey: "Cache e data store open source ad alte prestazioni",
      sqlite: "DB embedded leggero",
      docker: "Containerizzazione ed isolamento delle applicazioni",
      cicd: "Automazione pipeline di build e deploy",
      linux: "Amministrazione Server e ambienti Desktop",
      nginx: "Web server, reverse proxy e bilanciamento del carico",
      git: "Controllo di versione distribuito",
      rabbitmq: "Message Broker per architetture a eventi",
      proxmox: "Piattaforma di virtualizzazione server enterprise",
      lxc: "Gestione di ambienti e micro-istanze Linux leggere",
      tailscale: "VPN Mesh sicura basata su protocollo WireGuard",
      pihole: "Server DNS di rete con funzionalità di ad-blocking integrata",
      immich: "Gestione e backup self-hosted di foto e video ad alte prestazioni",
      cloudflare: "Tunnel sicuro per servizi locali, senza aprire porte.",
    },
  },
  projects: {
    title: "Progetti in Evidenza",
    subtitle:
      "Una raccolta di progetti che mostrano il mio percorso dallo sviluppo aziendale ai contributi open-source.",
    source: "Codice",
    sourceBe: "Codice Backend",
    sourceFe: "Codice Frontend",
    liveDemo: "Demo Live",
    viewAll: "Vedi Tutti i Repository",
    types: {
      gaming: "Gioco",
      fullstack: "Full-Stack",
      lab: "Lab/R&D",
      frontend: "Frontend",
    },
    items: [
      {
        title: "Cattenheimer",
        description:
          "Videogioco single-level in stile arcade sviluppato in Python con la libreria Pygame. Protagonista un gattino granatiere. Il progetto include la gestione e l'ottimizzazione dei livelli, intelligenza artificiale per i pattern dei nemici, calcolo accurato delle collisioni e fogli di sprite animati.",
      },
      {
        title: "Gestionale Sportivo",
        description:
          "Soluzione gestionale completa e scalabile basata su un'architettura multi-repository. Backend solido sviluppato in Node.js con Fastify e frontend reattivo in ReactJS. Implementa sistemi di autenticazione sicura, controllo degli accessi basato su ruoli e persistenza dei dati su database MySQL.",
      },
      {
        title: "Backend Sperimentale",
        description:
          "Progetto focalizzato sull'esplorazione di architetture a microservizi. Sviluppato con NestJS per garantire una struttura aziendale modulare e manutenibile, simula il backend ad alte prestazioni per una piattaforma di gaming online con gestione dei dati in tempo reale.",
      },
      {
        title: "Questo Portfolio",
        description:
          "Il sito web che stai navigando! Un esperimento pratico di sviluppo frontend moderno ed estetica curata, realizzato ottimizzando i flussi di lavoro grazie al supporto di strumenti AI di ultima generazione (Cursor e Claude Code).",
      },
    ],
  },
  homelab: {
    title: "Infrastruttura Self-Hosted",
    subtitle:
      "Il mio server casalingo basato su Proxmox per sviluppo, testing e servizi in produzione.",
    comingSoon: {
      badge: "In lavorazione",
      title: "Dashboard in arrivo",
      message:
        "Ci sto lavorando per renderla completamente dinamica: metriche in tempo reale, stato dei servizi e uptime verranno gestiti tramite API da un gateway middleware custom scritto in Rust.",
    },
  },
  about: {
    title: "Chi Sono",
    subtitle:
      "Il mio percorso formativo e professionale, dalle superiori allo sviluppo enterprise.",
    timeline: {
      "work-infogest": {
        title: "Sviluppatore Junior Backend",
        place: "Infogestweb s.r.l.",
        period: "ago 2025 - presente",
        description:
          "Sviluppo e manutenzione di servizi backend, API REST e pipeline DevOps. Lavoro con microservizi Node.js, layer dati MongoDB e integrazioni enterprise in C#.",
      },
      "edu-its": {
        title: "Diploma Tecnico Superiore -- Web Developer Full Stack",
        place: "ITS Digital Academy Mario Volpato",
        period: "ott 2024 - lug 2026",
        description:
          "Percorso biennale intensivo focalizzato sullo sviluppo full-stack: framework frontend, architetture backend, database relazionali e documentali, metodologie agili.",
      },
      "edu-itet": {
        title: "Diploma di Scuola Superiore -- Sistemi Informativi Aziendali",
        place: "ITET L.E V. Pasini",
        period: "set 2019 - giu 2024",
        description:
          "Percorso quinquennale che combina economia aziendale e fondamenti di programmazione, dai linguaggi procedurali alle tecnologie web.",
      },
    },
  },
  footer: {
    builtWith: "Costruito con passione",
  },
  contact: {
    title: "Contatti",
    subtitle: "Mettiamoci in contatto",
    nameLabel: "Nome",
    namePlaceholder: "Mario Rossi",
    emailLabel: "Email",
    emailPlaceholder: "mario@esempio.it",
    messageLabel: "Messaggio",
    messagePlaceholder: "Come posso aiutarti?",
    sendButton: "Invia Messaggio",
    sending: "Invio in corso...",
    successTitle: "Messaggio Inviato!",
    successMessage: "Grazie per avermi contattato. Ti risponderò il prima possibile.",
    sendAnother: "Invia un altro messaggio",
    errorMessage: "Errore durante l'invio. Riprova più tardi."
  }
};
