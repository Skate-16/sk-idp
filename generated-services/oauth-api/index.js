const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.json({ service: 'oauth-api', env: process.env.APP_ENV || 'dev', ok: true }));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.listen(port, () => console.log('oauth-api listening on ' + port));
