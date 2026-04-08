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
      languages: "Linguaggi & Framework",
      databases: "Database & Cache",
      devops: "DevOps & Infrastruttura",
      selfhosting: "Self-Hosting",
    },
    items: {
      javascript: "Node.js & Fastify",
      python: "Backend & scripting",
      csharp: "Ecosistema .NET",
      php: "Sviluppo web",
      vue: "Framework frontend",
      rabbitmq: "Message broker",
      mysql: "DB relazionale",
      mongodb: "Document store",
      redis: "Cache in-memory",
      postgresql: "SQL avanzato",
      sqlite: "DB embedded",
      elasticsearch: "Ricerca full-text",
      docker: "Containerizzazione",
      git: "Controllo versione",
      cicd: "Automazione",
      linux: "Sistema operativo",
      nginx: "Web server & proxy",
      portainer: "Gestione container",
      proxmox: "Virtualizzazione",
      lxc: "VM leggere",
      networking: "VLAN & DNS",
      monitoring: "Salute del sistema",
      tailscale: "VPN mesh",
      pihole: "DNS & ad-block",
    },
  },
  projects: {
    title: "Progetti in Evidenza",
    subtitle:
      "Una raccolta di progetti che mostrano il mio percorso dallo sviluppo aziendale ai contributi open-source.",
    source: "Codice",
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
          "Un gioco \"esercizio di stile\" in Python con un singolo livello custom creato con TSX e TMX, nemici con AI basilare e senza sistema di salvataggio/caricamento.",
      },
      {
        title: "App Gestionale Full-Stack",
        description:
          "Una soluzione gestionale completa con backend Fastify e frontend React. Include autenticazione, accesso basato su ruoli e aggiornamenti in tempo reale.",
      },
      {
        title: "Backend Sperimentale",
        description:
          "Progetto R&D che esplora architetture a microservizi con design event-driven. Un sandbox per pattern backend all'avanguardia.",
      },
      {
        title: "Questo Portfolio",
        description:
          "Il sito che stai guardando! Costruito con Vue.js, mostra pratiche frontend moderne, animazioni fluide e design responsive.",
      },
    ],
  },
  homelab: {
    title: "Infrastruttura Self-Hosted",
    subtitle:
      "Il mio server casalingo basato su Proxmox per sviluppo, testing e servizi in produzione.",
    serverTitle: "Home Server",
    serverSubtitle: "Host Proxmox VE",
    online: "ONLINE",
    cpuUsage: "Uso CPU: 65% | Memoria: 11GB / 16GB",
    specs: { cpus: "CPU", threads: "Thread", ram: "RAM", storage: "Storage" },
    runningServices: "Servizi Attivi",
    services: {
      proxmox: "Hypervisor",
      pihole: "DNS & ad-blocking",
      cloudflare: "Esposizione sicura",
      vaultwarden: "Gestore password",
      nginx: "Reverse proxy",
      docker: "Orchestrazione container",
      immich: "Gestione foto",
      baikal: "CalDAV/CardDAV",
      tailscale: "VPN mesh",
    },
    network: "Rete",
    networkItems: { dns: "DNS", tunnel: "Tunnel", vpn: "VPN", proxy: "Proxy" },
    security: "Sicurezza",
    securityItems: {
      firewall: "Firewall",
      enabled: "Attivo",
      ssl: "SSL/TLS",
      sslValue: "Let's Encrypt",
      backups: "Backup",
      backupsValue: "Giornalieri",
      twofa: "2FA",
      twofaValue: "Tutti gli utenti",
    },
    uptime: "Uptime",
    uptimePeriod: "Ultimi 90 giorni",
    uptimeBar: "Ultimi 30 giorni",
    maintenance: "Manutenzione",
    operational: "Operativo",
  },
  about: {
    title: "Chi Sono",
    subtitle:
      "Il mio percorso formativo e professionale, dalle superiori allo sviluppo enterprise.",
    timeline: {
      "work-infogest": {
        title: "Sviluppatore Junior Backend",
        place: "Infogestweb s.r.l.",
        description:
          "Sviluppo e manutenzione di servizi backend, API REST e pipeline DevOps. Lavoro con microservizi Node.js, layer dati MongoDB e integrazioni enterprise in C#.",
      },
      "edu-its": {
        title: "Diploma Tecnico Superiore -- Web Developer Full Stack",
        place: "ITS Digital Academy Mario Volpato",
        description:
          "Percorso biennale intensivo focalizzato sullo sviluppo full-stack: framework frontend, architetture backend, database relazionali e documentali, metodologie agili.",
      },
      "edu-itet": {
        title: "Diploma di Scuola Superiore -- Sistemi Informativi Aziendali",
        place: "ITET L.E V. Pasini",
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
