// Networking: the laptop (TV) is the host; phones connect to it with PeerJS (WebRTC).
// PeerJS's free public broker is only used to introduce devices; game data flows directly.
(function () {
  const PREFIX = 'lastrecital-v1-';
  const PEER_OPTS = { debug: 1 };

  class Host {
    constructor(code, handlers, prefix) {
      this.code = code; this.prefix = prefix || PREFIX;
      this.h = handlers; // {onMessage(conn,msg), onClose(conn), onStatus(text, ok)}
      this.conns = new Set();
      this.start();
    }
    start() {
      if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
      this.h.onStatus('Opening the house…', false);
      const peer = new Peer(this.prefix + this.code, PEER_OPTS);
      this.peer = peer;
      peer.on('open', () => this.h.onStatus('Ready', true));
      peer.on('connection', (conn) => {
        conn.on('open', () => { this.conns.add(conn); });
        conn.on('data', (d) => { try { this.h.onMessage(conn, typeof d === 'string' ? JSON.parse(d) : d); } catch (e) { console.error(e); } });
        conn.on('close', () => { this.conns.delete(conn); this.h.onClose(conn); });
        conn.on('error', () => { this.conns.delete(conn); this.h.onClose(conn); });
      });
      peer.on('disconnected', () => {
        this.h.onStatus('Reconnecting to broker…', false);
        setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 1500);
      });
      peer.on('error', (e) => {
        console.warn('host peer error', e.type, e);
        if (e.type === 'unavailable-id') {
          this.h.onStatus('Waiting for the old session to close…', false);
          setTimeout(() => this.start(), 4000);
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) {
          this.h.onStatus('Network trouble — retrying…', false);
          setTimeout(() => this.start(), 4000);
        }
      });
    }
    send(conn, msg) { if (conn && conn.open) { try { conn.send(msg); } catch (e) {} } }
  }

  class Client {
    constructor(code, handlers, prefix) {
      this.code = code; this.prefix = prefix || PREFIX;
      this.h = handlers; // {onMessage(msg), onStatus(connected:boolean, text)}
      this.lastPong = 0;
      this.connected = false;
      this.makePeer();
      setInterval(() => this.watchdog(), 3000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.watchdog(true); });
    }
    makePeer() {
      if (this.peer) { try { this.peer.destroy(); } catch (e) {} }
      const peer = new Peer(PEER_OPTS);
      this.peer = peer;
      peer.on('open', () => this.connect());
      peer.on('disconnected', () => setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 1500));
      peer.on('error', (e) => {
        console.warn('client peer error', e.type);
        if (e.type === 'peer-unavailable') { this.setStatus(false, 'Looking for the TV…'); setTimeout(() => this.connect(), 2500); }
        else if (['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible'].includes(e.type)) {
          this.setStatus(false, 'Network trouble — retrying…'); setTimeout(() => this.makePeer(), 3000);
        }
      });
    }
    connect() {
      if (this.stopped) return;
      if (!this.peer || this.peer.destroyed) return this.makePeer();
      if (this.peer.disconnected) { try { this.peer.reconnect(); } catch (e) {} return; }
      if (this.conn) { try { this.conn.close(); } catch (e) {} }
      this.setStatus(false, 'Connecting…');
      const conn = this.peer.connect(this.prefix + this.code, { reliable: true, serialization: 'json' });
      this.conn = conn;
      conn.on('open', () => {
        if (conn !== this.conn) return;
        this.lastPong = Date.now();
        this.setStatus(true, 'Connected');
        this.h.onOpen && this.h.onOpen();
      });
      conn.on('data', (d) => {
        if (conn !== this.conn) return;
        const msg = typeof d === 'string' ? JSON.parse(d) : d;
        this.lastPong = Date.now();
        if (msg.t === 'pong') return;
        this.h.onMessage(msg);
      });
      conn.on('close', () => { if (conn === this.conn && !this.stopped) { this.setStatus(false, 'Reconnecting…'); setTimeout(() => { if (conn === this.conn) this.connect(); }, 1500); } });
      conn.on('error', () => {});
    }
    stop() { this.stopped = true; if (this.conn) { const c = this.conn; this.conn = null; try { c.close(); } catch (e) {} } this.setStatus(false, 'Paused'); }
    resume() { this.stopped = false; this.connect(); }
    watchdog(force) {
      if (this.stopped) return;
      if (this.conn && this.conn.open) {
        this.send({ t: 'ping' });
        if (Date.now() - this.lastPong > 11000 || force && Date.now() - this.lastPong > 6000) {
          this.setStatus(false, 'Reconnecting…');
          this.connect();
        }
      } else if (!this.conn || (!this.conn.open && Date.now() - (this._lastTry || 0) > 6000)) {
        this._lastTry = Date.now();
        this.connect();
      }
    }
    setStatus(ok, text) { this.connected = ok; this.h.onStatus(ok, text); }
    send(msg) { if (this.conn && this.conn.open) { try { this.conn.send(msg); return true; } catch (e) {} } return false; }
  }

  // each game has its own id space so the two games never collide
  const PREFIXES = { lr: PREFIX, bw: 'blackwood-v1-' };
  window.Net = { Host, Client, PREFIX, PREFIXES };
})();
