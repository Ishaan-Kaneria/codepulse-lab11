// netlify/functions/api.mjs
// Runs the same Express app as a Netlify Function (v2), so /api/* works on the deployed site.
// v2 functions receive Netlify Database's connection string (NETLIFY_DB_URL) through Netlify.env.
import { createRequire } from 'node:module';
import serverless from 'serverless-http';

const require = createRequire(import.meta.url);
let handler;

function getHandler() {
  if (!handler) {
    const url = globalThis.Netlify?.env?.get('NETLIFY_DB_URL');
    if (url && !process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = url;
    const app = require('../../server/app.js');   // loads server/db.js, which reads the URL
    handler = serverless(app);
  }
  return handler;
}

export default async (req) => {
  const u = new URL(req.url);
  const headers = Object.fromEntries(req.headers.entries());
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();
  const res = await getHandler()({
    httpMethod: req.method,
    path: u.pathname,
    rawQuery: u.search.slice(1),
    queryStringParameters: Object.fromEntries(u.searchParams),
    multiValueQueryStringParameters: [...u.searchParams.keys()].reduce(
      (o, k) => ({ ...o, [k]: u.searchParams.getAll(k) }), {}),
    headers,
    body,
    isBase64Encoded: false
  }, {});
  return new Response(res.isBase64Encoded ? Buffer.from(res.body, 'base64') : res.body, {
    status: res.statusCode,
    headers: res.headers
  });
};

export const config = { path: '/api/*' };
