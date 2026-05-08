'use strict';
const https = require('https');

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

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  const batch = (event.queryStringParameters || {}).batch;
  if (!batch) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing batch parameter' }) };
  }

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'AIRTABLE_TOKEN environment variable not set' }) };
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
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
  } catch (e) {
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: e.message }) };
  }
};
