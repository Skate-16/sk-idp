const catalogModel = require('../models/catalogModel');
const eventModel = require('../models/eventModel');
const { withRuntimeStatus } = require('../services/statusService');

async function serviceStatus(req, res) {
  const service = catalogModel.findByName(req.params.name);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const [status] = await withRuntimeStatus([service]);
  res.json(status);
}

function updateAwsUrl(req, res) {
  const service = catalogModel.update(req.params.name, { awsUrl: req.body.awsUrl });
  if (!service) return res.status(404).json({ error: 'Service not found' });
  eventModel.add('aws-url', `Updated AWS URL for ${service.name}`, { awsUrl: service.awsUrl });
  res.json({ ok: true, service: service.name, awsUrl: service.awsUrl });
}

function health(req, res) {
  res.json({ ok: true });
}

module.exports = { serviceStatus, updateAwsUrl, health };
