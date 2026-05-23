const { randomUUID } = require('crypto');
const catalogModel = require('../models/catalogModel');
const eventModel = require('../models/eventModel');
const { createServiceFiles } = require('../generators/serviceGenerator');
const { validateService } = require('./governanceService');
const slugify = require('../utils/slugify');

function buildInput(body) {
  return {
    name: slugify(body.name || ''),
    owner: (body.owner || '').trim(),
    dockerHubUser: (body.dockerHubUser || '').trim(),
    template: body.template,
    env: body.env,
    replicas: Number(body.replicas || 1),
    costCenter: (body.costCenter || 'learning').trim()
  };
}

function provision(body) {
  const input = buildInput(body);
  const errors = validateService(input);
  if (errors.length) return { errors, values: body };

  const catalog = catalogModel.all();
  if (catalog.find(service => service.name === input.name)) {
    return { errors: ['Service already exists in catalog.'], values: body };
  }

  const nodePort = 31000 + catalog.length;
  const service = {
    id: randomUUID(),
    ...input,
    ownerLabel: input.owner.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
    status: 'ready',
    createdAt: new Date().toISOString(),
    gatewayPath: `/api/${input.name}`,
    nodePort,
    publicUrl: `http://localhost:${nodePort}`,
    awsUrl: '',
    dockerImage: `${input.dockerHubUser}/${input.name}:latest`,
    repoPath: `generated-services/${input.name}`
  };

  createServiceFiles(service);
  catalogModel.add(service);
  eventModel.add('provision', `Created ${service.name}`, { owner: service.owner, env: service.env });

  return { service };
}

module.exports = { provision };
