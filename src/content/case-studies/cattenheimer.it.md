# Costruire Cattenheimer

## Contesto

Cattenheimer è un platformer 2D in pixel art scritto in **Python** con
**pygame-ce**: un gatto esploratore armato di granate, una barra della stamina e
un mondo da attraversare. Il nome è esattamente quello che sembra — *cat* più
*Oppenheimer* — perché tutto il sistema di combattimento ruota attorno al lancio
di granate.

È stato il mio primo vero progetto di game development. Avevo appena studiato le
basi di Python e volevo metterle alla prova su qualcosa di più vivo degli
esercizi, così ho passato il tempo libero a costruire un gioco. È servito anche
come progetto d'esame per uno dei corsi del mio ITS, ma onestamente l'esame era
la scusa: lo stavo costruendo per me. Sono partito da un tutorial su YouTube per
imparare i fondamenti, poi me ne sono allontanato passo dopo passo — il mio
tileset, la mia mappa, le mie meccaniche di gioco e un protagonista tutto mio: un
gattino preso da un asset pack gratuito e ben fatto trovato su itch.io, che mi
sembrava l'eroe giusto per il tono del gioco.

![Il prato iniziale di Cattenheimer, con il cartello del tutorial che spiega i comandi](/case-studies/cattenheimer-tutorial.png)

## Sfide

Tre cose si sono rivelate molto più difficili di quanto il tutorial lasciasse
intendere:

- **Le collisioni.** All'inizio semplicemente non sapevo come gestirle. I tile
  non sono quadrati pieni — l'erba ha bordi frastagliati, le pendenze sono
  diagonali — quindi i controlli ingenui rettangolo-contro-rettangolo facevano
  fluttuare il gatto sopra il terreno o lo incastravano su spigoli invisibili.
- **Le prestazioni.** Una prima versione ricalcolava troppe cose a ogni frame e
  l'intero gioco laggava. Un platformer che scatta è ingiocabile, quindi andava
  risolto, non tollerato.
- **Le versioni.** Prima di questo progetto la mia idea di version control erano
  cartelle su Google Drive. Ha smesso di funzionare quasi subito.

## Soluzioni tecniche

Per le collisioni ho finito per costruire la geometria del terreno **dai pixel
dei tile stessi**. Al caricamento il gioco scansiona ogni tile del terreno una
sola volta: i tile con superficie piatta ottengono una hitbox esatta, ritagliata
sui pixel visibili, mentre i tile inclinati ottengono una **heightmap
per colonna** — l'altezza della superficie sotto ogni colonna di pixel — così i
personaggi seguono davvero il profilo della pendenza invece di salirla a
gradini. Le granate usano invece i rettangoli pieni dei tile, più adatti a un
proiettile che rimbalza. I controlli di collisione guardano solo le poche celle
della griglia che un'entità occupa davvero, mai l'intera mappa.

La soluzione per le prestazioni è stata classica e soddisfacente: invece di
scalare e disegnare ogni tile a ogni frame, l'intera mappa viene
**pre-renderizzata una volta su un'unica surface** (con una cache dei tile già
scalati), e ogni frame si limita a blittarla all'offset della camera. Dietro,
uno sfondo parallasse a quattro livelli scorre a velocità diverse per dare
profondità.

![Nel profondo della grotta, schivando i proiettili di uno scheletro nemico](/case-studies/cattenheimer-cave.png)

Attorno a quel nucleo il progetto ha preso una struttura vera: pacchetti
modulari (`core` per game loop e asset, `world` per camera e collisioni,
`entities` per personaggi e armi, `ui` per i menu). I livelli sono costruiti in
**Tiled**, con object layer che piazzano lo spawn del giocatore, i nemici, gli
oggetti e i cartelli del tutorial; i nemici hanno proprietà per-istanza come
vita e velocità d'inseguimento, così la difficoltà si regola nell'editor, non
nel codice. Il combattimento offre tre tipi di granate con un lancio a mira
caricata — più a lungo miri, più lontano vola — e il movimento si regge su una
riserva di stamina consumata da scatti e salti. Le impostazioni (volume,
difficoltà, fullscreen) vengono salvate in un file JSON.

Questo è anche il progetto che mi ha insegnato **perché esiste il version
control**. Il primo commit della mia prima repository Git in assoluto è il
commit iniziale di Cattenheimer, e la storia che segue — i refactor in moduli, i
fix alle collisioni, i commit delle feature — racconta il progetto come una
cartella su Drive non avrebbe mai potuto.

## Risultato

Il progetto è rimasto fermo per parecchio tempo, poi l'ho ripreso in mano con
più esperienza e si è visto: ho rifattorizzato le parti più deboli, tradotto
tutto il codice in inglese, reso l'AI più intelligente e aggiunto knockback,
mira delle granate e persistenza delle impostazioni. Oggi Cattenheimer è un
unico grande livello completo — di fatto un lungo tutorial — ed è questo il suo
stato attuale, detto onestamente: una fondazione. Il piano è farlo crescere in
un vero gioco multi-livello, riprogettando ciò che ora so fare meglio.

![Le isole fluttuanti verso la fine del livello, con un pianeta rosso all'orizzonte](/case-studies/cattenheimer-islands.png)

Più del gioco in sé, di questo progetto mi porto dietro il salto che mi ha
imposto: dagli esercizi di Python a una codebase viva con vincoli reali — frame
budget, casi limite delle collisioni, una pipeline con un editor — e dalle
cartelle su Drive a Git. Il codice completo è su
[GitHub](https://github.com/1brecane/cattenheimer).
