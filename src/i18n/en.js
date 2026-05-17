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
    headline: "From Code to",
    headlineHighlight: "Production",
    headlineEnd: "",
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
      languages: "Languages, Frameworks & Tools",
      databases: "Databases & Cache",
      devops: "DevOps & Infrastructure",
      selfhosting: "Self-Hosting",
    },
    items: {
      javascript: "Node.js & Fastify",
      rust: "High-performance backend systems",
      csharp: ".NET ecosystem",
      php: "Laravel",
      vue: "Frontend experimentation",
      cursorAi: "AI-assisted software development",
      mysql: "Relational DB",
      mongodb: "BSON document management",
      redis: "Cache & in-memory data store",
      postgresql: "Advanced relational DB",
      valkey: "High-performance open-source cache and data store",
      sqlite: "Lightweight embedded DB",
      docker: "Application containerization and isolation",
      cicd: "Build and deploy pipeline automation",
      linux: "Server administration and desktop environments",
      nginx: "Web server, reverse proxy and load balancer",
      git: "Distributed version control",
      rabbitmq: "Message broker for event-driven architectures",
      proxmox: "Enterprise server virtualization platform",
      lxc: "Lightweight Linux environment and micro-instance management",
      tailscale: "Secure mesh VPN based on WireGuard protocol",
      pihole: "Network DNS server with built-in ad-blocking",
      immich: "High-performance self-hosted photo and video management and backup",
      cloudflare: "Secure tunnel for local services, no open ports needed.",
    },
  },
  projects: {
    title: "Featured Projects",
    subtitle:
      "A collection of projects showcasing my journey from corporate development to open-source contributions.",
    source: "Source",
    sourceBe: "Backend",
    sourceFe: "Frontend",
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
        title: "Cattenheimer",
        description:
          "A single-level arcade game developed in Python using the Pygame library, featuring a grenade-wielding kitten. The project covers level optimization, enemy AI patterns, accurate collision detection, and animated sprite sheets.",
      },
      {
        title: "This Portfolio",
        description:
          "The website you are currently browsing! A hands-on experiment in modern frontend development and clean aesthetics, crafted by optimizing workflows using cutting-edge AI tools (Cursor and Claude Code).",
      },
      {
        title: "Experimental Backend",
        description:
          "A project focused on exploring microservices architectures. Built with NestJS to ensure a modular and maintainable enterprise structure, it simulates a high-performance backend for an online gaming platform with real-time data handling.",
      },
      {
        title: "Sports Management App",
        description:
          "A comprehensive and scalable management platform built on a multi-repository architecture. Features a robust Node.js backend using Fastify and a responsive ReactJS frontend. Includes secure authentication, role-based access control, and persistent data storage via MySQL.",
      },
    ],
  },
  homelab: {
    title: "Self-Hosted Infrastructure",
    subtitle:
      "My personal Proxmox-based home server setup for development, testing, and running production services.",
    comingSoon: {
      badge: "Work in progress",
      title: "Dashboard coming soon",
      message:
        "Currently working on making this section fully dynamic: real-time metrics, service health, and uptime will be served via APIs from a custom middleware gateway written in Rust.",
    },
  },
  about: {
    title: "About Me",
    subtitle:
      "My educational path and professional experience, from high school to enterprise development.",
    timeline: {
      "work-infogest": {
        title: "Junior Backend Developer",
        place: "Infogestweb s.r.l.",
        period: "Aug 2025 - Present",
        description:
          "Building and maintaining backend services, REST APIs, and DevOps pipelines. Working with Node.js microservices, MongoDB data layers, and C# enterprise integrations.",
      },
      "edu-its": {
        title: "Higher Technical Diploma -- Full Stack Web Developer",
        place: "ITS Digital Academy Mario Volpato",
        period: "Oct 2024 - Jul 2026",
        description:
          "Two-year intensive program focused on full-stack development, covering frontend frameworks, backend architectures, relational and document databases, and agile methodologies.",
      },
      "edu-itet": {
        title: "High School Diploma -- Business Information Systems",
        place: "ITET L.E V. Pasini",
        period: "Sep 2019 - Jun 2024",
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
