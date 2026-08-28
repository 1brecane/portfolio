# Costruire uptime-kuma-rs

## Contesto

[Uptime Kuma](https://github.com/louislam/uptime-kuma) è lo strumento di
monitoraggio dietro la sezione Home Lab di questo stesso sito — tiene
d'occhio ogni servizio self-hosted e ne riporta stato, latenza e uptime. È
un'ottima dashboard, ma non è mai stata pensata per essere un'API: la sua UI
parla con il backend attraverso un'interfaccia socket.io non documentata e
instabile tra le versioni, quindi qualunque cosa voglia gli stessi dati non
ha nulla di stabile su cui appoggiarsi. `uptime-kuma-rs` è un piccolo
servizio in **Rust** che colma questo divario — interroga gli endpoint
pubblici della status page di Uptime Kuma e riespone tutto come una REST API
pulita e read-only su cui altri servizi possono costruire senza rompersi al
prossimo aggiornamento di Uptime Kuma.

## Sfide

- **Nessuna vera API da chiamare.** L'unica superficie pubblica è il JSON che
  una status page usa per renderizzare i propri widget — mai pensato come
  fonte dati generica, e porta con sé solo 24 ore di storico continuo.
- **Uptime a 7 e 30 giorni richiedono più storico di quanto Uptime Kuma
  conservi.** Se l'API si limitasse a inoltrare ciò che Uptime Kuma espone,
  l'uptime settimanale e mensile sarebbe semplicemente impossibile da
  calcolare.
- **Onestà sui dati parziali.** Un'istanza appena avviata non gira ancora da
  una settimana — riportare una percentuale di uptime a 7 giorni come se
  fosse completa significherebbe mentire silenziosamente con un numero.

## Soluzioni tecniche

Il servizio segue una pipeline **poll → cache → serve**, dove ogni fase ha
esattamente una responsabilità:

1. Un task in background (`poller/`) recupera a intervalli la lista dei
   monitor della status page e gli heartbeat recenti — nessuna
   autenticazione richiesta, perché è lo stesso JSON usato dalla status page
   pubblica.
2. Ogni nuovo heartbeat viene persistito su **SQLite** (`store/`),
   deduplicato su `(monitor_id, time)`. Questa è la vera fonte di verità:
   dato che l'API della status page restituisce solo 24h di storico, uptime
   a 7/30 giorni e cronologia degli incidenti vanno accumulati localmente nel
   tempo, non recuperati su richiesta.
3. Uptime e incidenti vengono calcolati da questo storico salvato: le 24h
   arrivano direttamente dalla status page, mentre 7g/30g e i periodi di
   incidente sono aggregati da SQLite con una query SQL a funzioni finestra
   che rileva le transizioni su/giù nello storico degli heartbeat salvati —
   non un diffing live in-process, quindi la cronologia degli incidenti
   sopravvive intatta a un riavvio.
4. I risultati vengono assemblati in un unico snapshot e scambiati
   atomicamente in una cache in memoria (`arc-swap`), lock-free lato lettura.
5. Gli handler HTTP (`api/`, costruiti su **Axum**) non fanno altro che
   leggere lo snapshot corrente e servire la porzione rilevante come JSON —
   non toccano mai direttamente il poller o il database.

Il problema dell'"onestà sui dati parziali" ha una risposta precisa: ogni
valore di uptime a 7/30 giorni viaggia insieme a un valore `coverage`
(0.0–1.0) che mostra quanto di quella finestra sia effettivamente coperto da
storico salvato, così un servizio che consuma l'API può distinguere un
numero completo da uno parziale invece di essere silenziosamente ingannato
da un'istanza attiva solo da un giorno.

Il resto dello stack è **Tokio** per l'asincronia, **SQLx** per SQL
verificato a compile-time contro SQLite, **reqwest** per il polling e
**tower-http** per il middleware CORS/tracing/timeout — un set di dipendenze
volutamente ridotto per un servizio pensato per girare come un altro
container leggero accanto a ciò che monitora.

## Risultato

I tre endpoint che il progetto si proponeva di realizzare sono implementati e
in funzione: `GET /api/monitors` (stato e latenza correnti), `GET
/api/uptime` (rapporti 24h/7g/30g con coverage) e `GET /api/incidents`
(periodi di down ricostruiti). Viene distribuito come immagine **Docker** con
un ingombro minimo — hot path in memoria, SQLite per la durabilità, nient'altro
richiesto per un deployment a istanza singola. L'enforcement dell'autenticazione
`X-Api-Key`, il CORS configurabile e un livello di cache Redis per setup
multi-replica sono progettati ma non ancora collegati — un limite dichiarato,
non nascosto. Il codice sorgente completo è su
[GitHub](https://github.com/1brecane/uptime-kuma-rs).
