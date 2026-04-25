const https = require('https');
const http = require('http');
const tls = require('tls');
const zlib = require('zlib');
const { URL } = require('url');


const PROXY = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy;

function collectResponse(res, resolve, reject) {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    const encoding = res.headers['content-encoding'];
    const decompress = encoding === 'gzip' ? zlib.gunzip : encoding === 'deflate' ? zlib.inflate : null;
    const done = raw => {
      try { resolve(JSON.parse(raw.toString())); }
      catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
    };
    if (decompress) decompress(buf, (err, out) => err ? reject(err) : done(out));
    else done(buf);
  });
  res.on('error', reject);
}

function doRequest(socket, urlStr, opts, resolve, reject) {
  const url = new URL(urlStr);
  const body = opts.body != null ? JSON.stringify(opts.body) : null;
  const headers = {
    ...(opts.headers || {}),
    ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
  };

  const reqOpts = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: opts.method || 'GET',
    headers,
    timeout: opts.timeout || 20000,
    ...(socket ? { createConnection: () => tls.connect({ socket, hostname: url.hostname, servername: url.hostname }) } : {}),
  };

  const req = https.request(reqOpts, res => collectResponse(res, resolve, reject));
  req.on('timeout', () => req.destroy(new Error('request timeout')));
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
}

function jsonRequest(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    if (!PROXY) {
      doRequest(null, urlStr, opts, resolve, reject);
      return;
    }

    const proxy = new URL(PROXY);
    const target = new URL(urlStr);
    const connectTarget = `${target.hostname}:${target.port || 443}`;

    const connectReq = http.request({
      hostname: proxy.hostname,
      port: parseInt(proxy.port) || 80,
      method: 'CONNECT',
      path: connectTarget,
      headers: { 'Host': connectTarget },
      timeout: opts.timeout || 20000,
    });

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }
      doRequest(socket, urlStr, opts, resolve, reject);
    });
    connectReq.on('timeout', () => connectReq.destroy(new Error('proxy connect timeout')));
    connectReq.on('error', reject);
    connectReq.end();
  });
}

module.exports = { jsonRequest };
