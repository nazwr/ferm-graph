'use strict';
require('dotenv').config();
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = process.env.PORT || 3000;
const BASE_ID = 'appZaNdq69JljGi0w';

function airtableFetch(tableName, token) {
  return new Promise((resolve, reject) => {
    const records = [];
    function fetchPage(offset) {
      const qs = offset ? '?offset=' + encodeURIComponent(offset) : '';
      const options = {
        hostname: 'api.airtable.com',
        path: '/v0/' + BASE_ID + '/' + encodeURIComponent(tableName) + qs,
        headers: { Authorization: 'Bearer ' + token },
      };
      const req = https.get(options, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.error) return reject(new Error(json.error.message || JSON.stringify(json.error)));
            if (Array.isArray(json.records)) records.push(...json.records);
            if (json.offset) fetchPage(json.offset);
            else resolve(records);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
    }
    fetchPage(null);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost:' + PORT);

  // Serve index.html at root for convenience
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  if (url.pathname !== '/api/data') {
    res.writeHead(404);
    return res.end('Not found');
  }

  const batch = url.searchParams.get('batch');
  if (!batch) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing batch parameter' }));
  }

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'AIRTABLE_TOKEN not set in .env' }));
  }

  try {
    const records = await airtableFetch(batch, token);
    const rows = records
      .map(r => ({
        date:  r.fields.Date  || null,
        brix:  r.fields.Brix  != null ? Number(r.fields.Brix)  : null,
        temp:  r.fields.Temp  != null ? Number(r.fields.Temp)  : null,
        ph:    r.fields.pH    != null ? Number(r.fields.pH)    : null,
        notes: r.fields.Notes || null,
      }))
      .filter(r => r.date && r.brix != null && r.temp != null);
    rows.sort((a, b) => a.date.localeCompare(b.date));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rows));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log('Fermentation proxy running at http://localhost:' + PORT);
  console.log('Open http://localhost:' + PORT + '/?batch=Batch+2601 to view the chart');
});
