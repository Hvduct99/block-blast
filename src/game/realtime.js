// realtime.js - ket noi Pusher Channels cho map chung nhieu nguoi.
// Client CHI gui hanh dong (di chuyen, dung chieu len muc tieu, chat). Sat thuong / EXP / roi do do PHP (api/rt.php) tinh.
// Vi tri nguoi choi: client event "client-move" (re, khong qua PHP). Neu Pusher app chua bat Client events -> tu chuyen tiep qua PHP.
(function () {
  'use strict';
  const RT = {
    pusher: null, ch: null, uch: null, stage: 0, me: 0, socketId: null, relay: false, connected: false,
    members: {}, h: {}, castSeq: 1, lastMoveAt: 0, lastMobsAt: 0,
    available() { return !!(window.Pusher && window.Backend && Backend.online); },
    on(name, fn) { this.h[name] = fn; },
    emit(name, ...a) { const f = this.h[name]; if (f) { try { f(...a); } catch (e) { console.error(e); } } },
    async join(stage) {
      if (!this.available()) return { ok: false, error: 'offline' };
      const j = await Backend.req('api/rt.php', { action: 'join', stage });
      if (!j || !j.ok) return j || { ok: false, error: 'Lỗi' };
      this.leave(true);
      this.stage = stage; this.me = +j.me; this.members = {};
      const P = j.pusher;
      if (!this.pusher || this.pusher.key !== P.key) {
        try { if (this.pusher) this.pusher.disconnect(); } catch (_) { }
        this.pusher = new window.Pusher(P.key, { cluster: P.cluster, forceTLS: true, channelAuthorization: { endpoint: 'api/pusher_auth.php', transport: 'ajax' } });
        this.pusher.key = P.key;
        this.pusher.connection.bind('state_change', s => { this.connected = s.current === 'connected'; this.socketId = this.pusher.connection.socket_id || null; this.emit('conn', s.current); });
        this.pusher.connection.bind('error', e => this.checkClientEventError(e));
        this.pusher.bind_global && this.pusher.bind_global((ev, data) => { if (ev === 'pusher:error') this.checkClientEventError(data); });
      }
      const ch = this.ch = this.pusher.subscribe(P.channel);
      ch.bind('pusher:subscription_succeeded', members => {
        this.members = {};
        members.each(m => { this.members[m.id] = m.info || {}; });
        this.socketId = this.pusher.connection.socket_id || null;
        this.emit('members', this.members);
      });
      ch.bind('pusher:subscription_error', e => this.emit('error', 'Không vào được bản đồ chung (' + ((e && e.status) || '') + ')'));
      ch.bind('pusher:member_added', m => { this.members[m.id] = m.info || {}; this.emit('member_added', m.id, m.info || {}); });
      ch.bind('pusher:member_removed', m => { delete this.members[m.id]; this.emit('member_removed', m.id); });
      ch.bind('client-move', (d, meta) => { const id = meta && meta.user_id ? +meta.user_id : +d.id; if (id && id !== this.me) this.emit('move', id, d); });
      ch.bind('move', d => { if (+d.id !== this.me) this.emit('move', +d.id, d); });
      ch.bind('client-mobs', (d, meta) => { const id = meta && meta.user_id ? +meta.user_id : +d.id; if (id !== this.me) this.emit('mobs', d.list || []); });
      ch.bind('mobs', d => { if (+d.id !== this.me) this.emit('mobs', d.list || []); });
      ch.bind('mob-hit', d => { if (+d.by !== this.me) this.emit('mob_hit', d); });
      ch.bind('mob-spawn', d => this.emit('mob_spawn', d));
      ch.bind('chat', d => { if (+d.uid !== this.me) this.emit('chat', d); });
      ch.bind('loot-drop', d => this.emit('loot_drop', d));
      ch.bind('loot-take', d => this.emit('loot_take', d));
      if (P.user_channel) {
        this.uch = this.pusher.subscribe(P.user_channel);
        this.uch.bind('reward', d => this.emit('reward', d));
      }
      return j;
    },
    leave(silent) {
      try { if (this.ch) this.pusher.unsubscribe(this.ch.name); } catch (_) { }
      try { if (this.uch) this.pusher.unsubscribe(this.uch.name); } catch (_) { }
      const was = this.stage;
      this.ch = null; this.uch = null; this.members = {}; this.stage = 0;
      if (was && !silent && window.Backend && Backend.online) Backend.req('api/rt.php', { action: 'leave' });
    },
    checkClientEventError(e) {
      const s = JSON.stringify(e || {});
      if (/client event/i.test(s) && !this.relay) { this.relay = true; console.warn('Chuyển sang gửi vị trí qua máy chủ'); }
    },
    isHost() {
      const ids = Object.keys(this.members).map(Number).filter(n => n > 0);
      if (!ids.length) return true;
      return Math.min.apply(null, ids) === this.me;
    },
    othersCount() { return Object.keys(this.members).filter(id => +id !== this.me).length; },
    sendMove(d) {
      if (!this.ch || !this.othersCount()) return;
      const now = Date.now();
      if (this.relay) {
        if (now - this.lastMoveAt < 450) return; this.lastMoveAt = now;
        Backend.req('api/rt.php', Object.assign({ action: 'move', stage: this.stage, socket_id: this.socketId || '' }, d));
      } else {
        if (now - this.lastMoveAt < 300) return; this.lastMoveAt = now;
        try { this.ch.trigger('client-move', Object.assign({ id: this.me }, d)); } catch (_) { }
      }
    },
    sendMobs(list) {
      if (!this.ch || !this.othersCount() || !list.length) return;
      const now = Date.now();
      if (this.relay) {
        if (now - this.lastMobsAt < 900) return; this.lastMobsAt = now;
        Backend.req('api/rt.php', { action: 'mobs', stage: this.stage, socket_id: this.socketId || '', list: JSON.stringify(list) });
      } else {
        if (now - this.lastMobsAt < 500) return; this.lastMobsAt = now;
        try { this.ch.trigger('client-mobs', { id: this.me, list }); } catch (_) { }
      }
    },
    newCast() { return this.castSeq++; },
    hitBatch(batch, px) { // nhieu lan thi trien trong 1 yeu cau: "chieu:cast:mid,mid;..."
      return Backend.req('api/rt.php', { action: 'hit', stage: this.stage, batch, px: Math.round(px || 0), socket_id: this.socketId || '' });
    },
    hit(skill, cast, targets, px) {
      return Backend.req('api/rt.php', { action: 'hit', stage: this.stage, skill, cast, targets: targets.join(','), px: Math.round(px || 0), socket_id: this.socketId || '' });
    },
    state() { return Backend.req('api/rt.php', { action: 'state', stage: this.stage, socket_id: this.socketId || '' }); },
    chat(text) { return Backend.req('api/rt.php', { action: 'chat', stage: this.stage, text, socket_id: this.socketId || '' }); },
  };
  window.RT = RT;
})();
