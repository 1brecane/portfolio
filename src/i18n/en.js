export default {
  nav: {
    home: "Home",
    about: "About",
    stack: "Stack",
    projects: "Projects",
    homelab: "Home Lab",
    contact: "Contact",
  },
  hero: {
    terminal: [
      "$ whoami",
      "samuele_ruaro",
      "$ cat ./about.txt",
      "Backend developer & self-hosting enthusiast.",
      "Building scalable systems, one commit at a time.",
      "$ _",
    ],
    headline: "Architecting",
    headlineHighlight: "Robust",
    headlineEnd: "Backends",
    subheadline:
      "I'm Samuele Ruaro -- a backend developer building enterprise-grade systems, self-hosted infrastructure, and scalable APIs. From Proxmox clusters to production Node.js services, I turn complex problems into clean, maintainable solutions.",
    viewProjects: "View Projects",
    downloadCv: "Download CV",
  },
  stack: {
    title: "Tech Stack",
    subtitle:
      "The tools and technologies I use to build robust, scalable backend systems.",
    categories: {
      languages: "Languages & Frameworks",
      databases: "Databases & Cache",
      devops: "DevOps & Infrastructure",
      selfhosting: "Self-Hosting",
    },
    items: {
      javascript: "Node.js & Fastify",
      python: "Backend & scripting",
      csharp: ".NET ecosystem",
      php: "Web development",
      vue: "Frontend framework",
      rabbitmq: "Message broker",
      mysql: "Relational DB",
      mongodb: "Document store",
      redis: "In-memory cache",
      postgresql: "Advanced SQL",
      docker: "Containerization",
      git: "Version control",
      cicd: "Automation",
      linux: "Server OS",
      proxmox: "Virtualization",
      lxc: "Lightweight VMs",
      networking: "VLANs & DNS",
      monitoring: "System health",
    },
  },
  projects: {
    title: "Featured Projects",
    subtitle:
      "A collection of projects showcasing my journey from corporate development to open-source contributions.",
    source: "Source",
    liveDemo: "Live Demo",
    viewAll: "View All Repositories",
    types: {
      gaming: "Game",
      fullstack: "Full-Stack",
      lab: "Lab/R&D",
      frontend: "Frontend",
    },
    items: [
      {
        title: "Python Game",
        description:
          "A terminal-based RPG game built entirely in Python. Features procedural dungeon generation, combat systems, and save/load functionality.",
      },
      {
        title: "Full-Stack Management App",
        description:
          "A comprehensive business management solution with Fastify backend and React frontend. Features authentication, role-based access, and real-time updates.",
      },
      {
        title: "Experimental Backend",
        description:
          "R&D project exploring microservices architecture with event-driven design. A learning sandbox for cutting-edge backend patterns.",
      },
      {
        title: "This Portfolio",
        description:
          "The very site you're viewing! Built with Vue.js showcasing modern frontend practices, smooth animations, and responsive design.",
      },
    ],
  },
  homelab: {
    title: "Self-Hosted Infrastructure",
    subtitle:
      "My personal Proxmox-based home server setup for development, testing, and running production services.",
    serverTitle: "Home Server",
    serverSubtitle: "Proxmox VE Host",
    online: "ONLINE",
    cpuUsage: "CPU Usage: 65% | Memory: 11GB / 16GB",
    specs: { cpus: "CPUs", threads: "Threads", ram: "RAM", storage: "Storage" },
    runningServices: "Running Services",
    services: {
      proxmox: "Hypervisor",
      pihole: "DNS & ad-blocking",
      cloudflare: "Secure exposure",
      vaultwarden: "Password manager",
      nginx: "Reverse proxy",
      docker: "Container orchestration",
      immich: "Photo management",
      baikal: "CalDAV/CardDAV",
      tailscale: "Mesh VPN",
    },
    network: "Network",
    networkItems: { dns: "DNS", tunnel: "Tunnel", vpn: "VPN", proxy: "Proxy" },
    security: "Security",
    securityItems: {
      firewall: "Firewall",
      enabled: "Enabled",
      ssl: "SSL/TLS",
      sslValue: "Let's Encrypt",
      backups: "Backups",
      backupsValue: "Daily",
      twofa: "2FA",
      twofaValue: "All users",
    },
    uptime: "Uptime",
    uptimePeriod: "Last 90 days",
    uptimeBar: "Last 30 days",
    maintenance: "Maintenance",
    operational: "Operational",
  },
  about: {
    title: "About Me",
    subtitle:
      "My educational path and professional experience, from high school to enterprise development.",
    timeline: {
      "work-infogest": {
        title: "Junior Backend Developer",
        place: "Infogestweb s.r.l.",
        description:
          "Building and maintaining backend services, REST APIs, and DevOps pipelines. Working with Node.js microservices, MongoDB data layers, and C# enterprise integrations.",
      },
      "edu-its": {
        title: "Higher Technical Diploma -- Full Stack Web Developer",
        place: "ITS Digital Academy Mario Volpato",
        description:
          "Two-year intensive program focused on full-stack development, covering frontend frameworks, backend architectures, relational and document databases, and agile methodologies.",
      },
      "edu-itet": {
        title: "High School Diploma -- Business Information Systems",
        place: "ITET L.E V. Pasini",
        description:
          "Five-year technical program combining business economics with programming fundamentals, from procedural languages to web technologies.",
      },
    },
  },
  footer: {
    builtWith: "Built with passion",
  },
  contact: {
    title: "Contact",
    subtitle: "Get in touch",
    nameLabel: "Name",
    namePlaceholder: "John Doe",
    emailLabel: "Email",
    emailPlaceholder: "john@example.com",
    messageLabel: "Message",
    messagePlaceholder: "How can I help you?",
    sendButton: "Send Message",
    sending: "Sending...",
    successTitle: "Message Sent!",
    successMessage: "Thank you for reaching out. I'll get back to you as soon as possible.",
    sendAnother: "Send another message",
    errorMessage: "Failed to send message. Please try again later."
  }
};
