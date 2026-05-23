const catalogModel = require('../models/catalogModel');
const eventModel = require('../models/eventModel');
const { catalogChecks } = require('../services/governanceService');
const { withRuntimeStatus } = require('../services/statusService');
const provisionService = require('../services/provisionService');

async function catalog(req, res) {
  res.render('catalog', { services: await withRuntimeStatus(catalogModel.all()) });
}

function provisionForm(req, res) {
  res.render('provision', { errors: [], values: { template: 'node-api', env: 'dev', replicas: 1 } });
}

function createService(req, res) {
  const result = provisionService.provision(req.body);
  if (result.errors) {
    const status = result.errors.includes('Service already exists in catalog.') ? 409 : 400;
    return res.status(status).render('provision', { errors: result.errors, values: result.values });
  }
  res.redirect(`/service/${result.service.name}`);
}

async function serviceDetails(req, res) {
  const service = catalogModel.findByName(req.params.name);
  if (!service) return res.status(404).send('Service not found');
  const [serviceWithStatus] = await withRuntimeStatus([service]);
  res.render('service', { service: serviceWithStatus });
}

function gateway(req, res) {
  res.render('gateway', { services: catalogModel.all() });
}

function governance(req, res) {
  res.render('governance', { checks: catalogChecks(catalogModel.all()) });
}

function observability(req, res) {
  res.render('observability', { events: eventModel.recent(), count: catalogModel.all().length });
}

module.exports = {
  catalog,
  provisionForm,
  createService,
  serviceDetails,
  gateway,
  governance,
  observability
};
