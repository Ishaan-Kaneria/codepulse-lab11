// netlify/functions/api.js
// Runs the same Express app as a Netlify Function, so /api/* works on the deployed site.
const serverless = require('serverless-http');
const app = require('../../server/app');

module.exports.handler = serverless(app);
