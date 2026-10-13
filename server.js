'use strict';

// Optional secure AI backend for StudyMate. Uses Node.js built-in modules only.
// The API key stays in this server process and is never sent to the browser.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !Object.prototype.hasOwnProperty.call(process.env, key)) process.env[key] = value;
  }
}
loadEnvFile();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request, maximumBytes = 10_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBytes) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(text || '{}'); }
  catch { throw new Error('INVALID_JSON'); }
}

function getOutputText(payload) {
  const parts = [];
  for (const item of payload.output || []) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function handleAssistant(request, response) {
  let body;
  try { body = await readJsonBody(request); }
  catch (error) {
    const message = error.message === 'REQUEST_TOO_LARGE' ? 'The question is too long.' : 'Please send a valid question.';
    return sendJson(response, error.message === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: message });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return sendJson(response, 400, { error: 'Please type a question.' });
  if (message.length > 2000) return sendJson(response, 413, { error: 'Please keep your question under 2,000 characters.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return sendJson(response, 503, { error: 'AI is not configured yet. The offline study helper is still available.' });

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  try {
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        instructions: 'You are StudyMate, a kind and careful study assistant for school students. Explain ideas in clear, simple English, teach step by step, use examples, ask a helpful follow-up question when needed, and encourage learning rather than merely giving unexplained answers. For homework, show the reasoning so the student can learn. If unsure, say so. Keep answers focused and age-appropriate. Do not ask for passwords, API keys, home addresses, or other sensitive personal information.',
        input: message,
        max_output_tokens: 600
      }),
      signal: AbortSignal.timeout(45_000)
    });

    const payload = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      // Log status only; never log the request, credentials, or student question.
      console.error(`OpenAI API returned HTTP ${apiResponse.status}.`);
      return sendJson(response, 502, { error: 'The AI service could not answer right now. Check your API setup and try again.' });
    }
    const answer = getOutputText(payload);
    if (!answer) return sendJson(response, 502, { error: 'The AI service returned an empty answer. Please try again.' });
    return sendJson(response, 200, { answer });
  } catch (error) {
    console.error(`AI request failed: ${error.name || 'Error'}.`);
    return sendJson(response, 502, { error: 'Could not reach the AI service. Please check your internet connection and try again.' });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/assistant') {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, { error: 'Use POST to ask a question.' });
    }
    return handleAssistant(request, response);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    return response.end('Method not allowed.');
  }

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { response.writeHead(400); return response.end('Bad request.'); }
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== path.join(ROOT, 'index.html')) {
    response.writeHead(403); return response.end('Forbidden.');
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('File not found.');
    }
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache'
    });
    if (request.method === 'HEAD') return response.end();
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`StudyMate is running at http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) console.log('AI mode: offline helper (add OPENAI_API_KEY to .env to enable real AI answers).');
});
