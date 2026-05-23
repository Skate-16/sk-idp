function validateService(input) {
  const errors = [];
  if (!/^[a-z][a-z0-9-]{2,39}$/.test(input.name)) errors.push('Service name must be lowercase, 3-40 chars, letters, numbers or hyphen.');
  if (!input.owner.includes('@')) errors.push('Owner must be an email address.');
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/i.test(input.dockerHubUser)) errors.push('Docker Hub username must be 3-40 chars, letters, numbers, underscore or hyphen.');
  if (!['dev', 'stage', 'prod'].includes(input.env)) errors.push('Environment must be dev, stage or prod.');
  if (!['node-api', 'static-web', 'worker'].includes(input.template)) errors.push('Unknown template.');
  if (input.replicas < 1 || input.replicas > 3) errors.push('Free-tier guardrail: replicas must be 1 to 3.');
  return errors;
}

function catalogChecks(services) {
  return services.map(service => ({
    name: service.name,
    ok: service.replicas <= 3 && service.owner.includes('@') && ['dev', 'stage', 'prod'].includes(service.env),
    notes: [
      service.replicas <= 3 ? 'Replica guardrail ok' : 'Too many replicas',
      service.owner.includes('@') ? 'Owner ok' : 'Owner missing',
      ['dev', 'stage', 'prod'].includes(service.env) ? 'Environment ok' : 'Environment invalid'
    ]
  }));
}

module.exports = { validateService, catalogChecks };
