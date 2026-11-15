// Test-only stand-in for PeerJS: routes messages between tabs with BroadcastChannel.
(function () {
  class Emitter { constructor() { this._h = {}; } on(e, f) { (this._h[e] = this._h[e] || []).push(f); } emit(e, ...a) { (this._h[e] || []).forEach((f) => f(...a)); } }
  class Conn extends Emitter {
    constructor(peer, remote, cid) { super(); this.peer = peer; this.peer_ = remote; this.cid = cid; this.open = false; }
    _open() { this.open = true; this.emit('open'); }
    send(d) { this.peer.ch.postMessage({ type: 'data', from: this.peer.id, to: this.peer_, cid: this.cid, data: JSON.parse(JSON.stringify(d)) }); }
    close() { if (!this.open) return; this.open = false; this.peer.ch.postMessage({ type: 'close', from: this.peer.id, to: this.peer_, cid: this.cid }); this.emit('close'); }
  }
  class Peer extends Emitter {
    constructor(id) {
      super(); if (typeof id !== 'string') id = 'p' + Math.random().toString(36).slice(2);
      this.id = id; this.conns = {}; this.destroyed = false; this.disconnected = false;
      this.ch = new BroadcastChannel('fakepeer');
      this.ch.onmessage = (e) => this._msg(e.data);
      setTimeout(() => this.emit('open', this.id), 30);
    }
    connect(target) { const cid = Math.random().toString(36).slice(2); const c = new Conn(this, target, cid); this.conns[cid] = c; this.ch.postMessage({ type: 'connect', from: this.id, to: target, cid }); return c; }
    _msg(m) {
      if (m.to !== this.id) return;
      if (m.type === 'connect') { const c = new Conn(this, m.from, m.cid); this.conns[m.cid] = c; this.emit('connection', c); setTimeout(() => { c._open(); this.ch.postMessage({ type: 'ack', from: this.id, to: m.from, cid: m.cid }); }, 10); }
      else if (m.type === 'ack') { const c = this.conns[m.cid]; c && c._open(); }
      else if (m.type === 'data') { const c = this.conns[m.cid]; c && c.emit('data', m.data); }
      else if (m.type === 'close') { const c = this.conns[m.cid]; if (c && c.open) { c.open = false; c.emit('close'); } }
    }
    reconnect() {} destroy() { this.destroyed = true; this.ch.close(); }
  }
  window.Peer = Peer;
})();
