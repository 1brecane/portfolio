# Come ho costruito questo portfolio

## Contesto

Questo sito è il progetto che stai guardando in questo momento. Volevo un portfolio
che facesse più che elencare esperienze e repository: che desse la sensazione di un
luogo, non di un CV travestito da pagina web. L'idea a cui tornavo di continuo era un
viaggio: non scorri una pagina verso il basso, ma piloti una camera attraverso lo spazio,
e ogni sezione è una tappa lungo il percorso.

È una single-page app in **Vue 3**, costruita con **Vite** e **Tailwind CSS 4**. I
contenuti sono bilingui (inglese e italiano), e tutto ciò che è animato deve saper
diventare statico quando il dispositivo o le preferenze di chi guarda lo richiedono. L'ho
sviluppato appoggiandomi molto ad AI — **Claude Code** e **Cursor** — cosa dichiarata
apertamente nei tag del progetto. Fa parte della storia: il lavoro interessante è stato il
design e il cablaggio delle parti, non digitare ogni riga a mano.

## Sfide

Alcune cose hanno reso il tutto più difficile di una normale pagina vetrina:

- **Lo sfondo doveva muoversi, ma senza mai dare fastidio.** Uno starfield ASCII animato
  dietro a del testo vivo è insieme una trappola per la leggibilità e per le performance.
- **Lo scroll doveva risultare cinematografico senza rompere l'accessibilità.** Sezioni
  fissate e guidate da una camera penalizzano proprio chi preferisce meno movimento, o chi
  naviga da uno smartphone piccolo o da una connessione a consumo.
- **Due lingue, senza framework pesanti.** Non volevo portarmi in casa una grande libreria di
  i18n per quello che, in fondo, è un sito personale.
- **Un CV scaricabile da proteggere** senza mettere in piedi un vero server di backend.

## Soluzioni tecniche

Lo sfondo è composto da **due layer Canvas 2D fissi** dietro alla pagina. Il primo,
`StarfieldBackground`, è uno starfield pseudo-3D di profondità: le stelle vivono in uno
spazio `x, y, z` e si proiettano verso l'esterno dal centro dello schermo, così ci voli
davvero *dentro* invece di passarci accanto come davanti a un campo piatto. Glifi come
`. : · * + = % @` mantengono l'identità ASCII, e ogni 15–30 secondi una rara cometa
attraversa il cielo, come ricompensa per chi la sta osservando. Il secondo layer,
`AsciiPlanets`, disegna due mondi ASCII che ruotano lentamente — un pianeta con gli anelli
alla partenza, una sfera piena all'arrivo — resi con una rampa di glifi per luminanza,
così da avere una profondità reale.

Il movimento è pilotato da una "camera" legata allo scroll (`useGalaxyJourney`). Ogni
sezione è una zona con uno zoom e un centro di destinazione: mentre una sezione è a
schermo la camera *tiene* quella zona, per avere uno sfondo stabile su cui leggere, e nei
vuoti tra una sezione e l'altra interpola verso la successiva con un arco di allontanamento
a metà tragitto — si allarga per mostrare di più, poi rientra. Le sezioni stesse sono
**slide fissate**: una piccola composable (`useScrollPresentation`) trasforma la posizione
di scroll in un progresso da `0` a `1`, e delle custom property CSS scandiscono la comparsa
di ogni blocco. Persino i titoli si decodificano lettera per lettera a partire dai glifi
mentre la slide arriva.

Il punto chiave è che tutto questo ha un interruttore di spegnimento incorporato. Entrambi
i canvas incorporano la dissolvenza nell'alpha di ogni singolo glifo (mai un `opacity` CSS
sul canvas, che sfocherebbe il testo), mettono in pausa il loop di animazione quando la
scheda non è visibile, e ripiegano su **un singolo frame statico** con
`prefers-reduced-motion`, su schermi sotto i 768px o con `prefers-reduced-data`. Negli
stessi casi l'intero viaggio si appiattisce in una normale pagina scrollabile, e un toggle
manuale di "vista semplice" permette anche a chi torna di rinunciarci.

Per le due lingue ho scritto un **piccolo layer di i18n custom**: due semplici oggetti di
messaggi e un `locale` reattivo condiviso, persistito in `localStorage`, senza dipendenze
esterne. Il form di contatto invia i messaggi tramite **EmailJS**, importato solo al momento dell'invio,
ed è protetto da **hCaptcha**. Il download del CV è filtrato da un **Cloudflare Worker** che
verifica il token hCaptcha lato server prima di lasciar passare `/cv.pdf`, con Nginx che fa
rate-limiting sullo stesso path come seconda linea di difesa.

Il deploy è una **build Docker multi-stage** (build con Node → runtime Nginx), portata in
produzione da una pipeline **GitHub Actions** su un **runner self-hosted** a ogni push su
`main`. Nginx serve asset già compressi e imposta una CSP rigorosa e i consueti header di
sicurezza.

## Risultato

Il risultato è un portfolio che si legge come un'esperienza voluta e che funziona per
chiunque: testo nitido su uno sfondo vivo, un volo cinematografico per chi lo desidera, e
una pagina semplice, veloce e statica per chi non lo vuole. Mi ha insegnato molto sulla
Canvas 2D API, su `prefers-reduced-motion` come vincolo di design e non come ripensamento
finale, e su quanto lontano possa arrivare un po' di codice custom prima di ricorrere a un
framework. Il codice sorgente completo è su
[GitHub](https://github.com/1brecane/portfolio).
