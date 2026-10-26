// pusher.js - Pusher Channels REST (trigger / batch) + ky xac thuc kenh, chi dung node:crypto + fetch (chay ca Deno lan Node)
import { createHash, createHmac } from 'node:crypto';

export function makePusher({ appId, key, secret, cluster }) {
  const host = 'https://api-' + (cluster || 'ap1') + '.pusher.com';
  const sign = s => createHmac('sha256', secret).update(s).digest('hex');
  async function post(path, payload) {
    const body = JSON.stringify(payload);
    const params = { auth_key: key, auth_timestamp: Math.floor(Date.now() / 1000), auth_version: '1.0', body_md5: createHash('md5').update(body).digest('hex') };
    const qs = Object.keys(params).sort().map(k => k + '=' + params[k]).join('&');
    const r = await fetch(host + path + '?' + qs + '&auth_signature=' + sign('POST\n' + path + '\n' + qs), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (!r.ok) throw new Error('Pusher ' + r.status + ': ' + (await r.text()).slice(0, 200));
  }
  const ev = (channel, name, data, socket_id) => Object.assign({ channel, name, data: JSON.stringify(data) }, socket_id ? { socket_id } : {});
  return {
    key,
    trigger(channel, name, data, socket_id) { const e = ev(channel, name, data, socket_id); return post('/apps/' + appId + '/events', { name, channels: [channel], data: e.data, ...(socket_id ? { socket_id } : {}) }); },
    triggerBatch(list) { return post('/apps/' + appId + '/batch_events', { batch: list.map(x => ev(x.channel, x.name, x.data, x.socket_id)) }); },
    // presence: { user_id, user_info } -> kenh presence-*; khong co -> kenh private-*
    authorizeChannel(socket, channel, presence) {
      let s = socket + ':' + channel; const o = {};
      if (presence) { o.channel_data = JSON.stringify(presence); s += ':' + o.channel_data; }
      o.auth = key + ':' + sign(s);
      return o;
    },
  };
}
