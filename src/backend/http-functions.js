// Backend proxy — Smart Briefing
// Resolve CORS para api.anthropic.com e wixapis.com
// Rotas:
//   POST /_functions/ai          → proxy para Anthropic
//   GET  /_functions/subclientes → lista subclientes do CMS

import { getSecret } from 'wix-secrets-backend';
import wixData from 'wix-data';

// ---------- POST /_functions/ai ----------
export async function post_ai(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.body.json();
    const apiKey = await getSecret('ANTHROPIC_KEY');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { status: response.status, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      status: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

// Preflight OPTIONS para /_functions/ai
export async function options_ai(request) {
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: '',
  };
}

// ---------- GET /_functions/subclientes ----------
export async function get_subclientes(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const result = await wixData
      .query('subclientes')
      .ascending('nome')
      .limit(200)
      .find({ suppressAuth: true });

    const items = result.items.map((i) => ({
      sigla: i.sigla || '',
      nome: i.nome || i.sigla || '',
    }));

    return { status: 200, headers, body: JSON.stringify({ items }) };
  } catch (err) {
    return {
      status: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
