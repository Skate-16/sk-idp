const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
const services = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const errors = [];

for (const service of services) {
  if (!service.owner || !service.owner.includes('@')) errors.push(`${service.name}: owner email missing`);
  if (service.replicas < 1 || service.replicas > 3) errors.push(`${service.name}: replicas outside free-tier guardrail`);
  if (!['dev', 'stage', 'prod'].includes(service.env)) errors.push(`${service.name}: invalid env`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Governance passed for ${services.length} service(s).`);
