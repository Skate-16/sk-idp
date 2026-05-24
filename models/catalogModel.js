const { catalogFile } = require('../config/paths');
const fileStore = require('../utils/fileStore');

function all() {
  return fileStore.readJson(catalogFile);
}

function save(services) {
  fileStore.writeJson(catalogFile, services);
}

function findByName(name) {
  return all().find(service => service.name === name);
}

function add(service) {
  const services = all();
  services.push(service);
  save(services);
}

function update(name, changes) {
  const services = all();
  const service = services.find(item => item.name === name);
  if (!service) return null;
  Object.assign(service, changes);
  save(services);
  return service;
}

function remove(name) {
  const services = all();
  const next = services.filter(service => service.name !== name);
  if (next.length === services.length) return null;
  save(next);
  return services.find(service => service.name === name);
}

module.exports = { all, save, findByName, add, update, remove };
