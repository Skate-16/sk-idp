const path = require('path');
const catalogModel = require('../models/catalogModel');
const eventModel = require('../models/eventModel');
const { generatedDir } = require('../config/paths');
const fileStore = require('../utils/fileStore');

function assertGeneratedPath(serviceName) {
  const target = path.join(generatedDir, serviceName);
  const relative = path.relative(generatedDir, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Refusing to delete outside generated-services.');
  }
  return target;
}

function deleteService(serviceName) {
  const service = catalogModel.remove(serviceName);
  if (!service) return false;

  fileStore.removeDir(assertGeneratedPath(serviceName));
  fileStore.removeDir(assertGeneratedPath(`${serviceName}@tmp`));
  eventModel.add('delete', `Deleted ${serviceName}`, { service: serviceName });
  return true;
}

module.exports = { deleteService };
