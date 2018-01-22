const cfg = {};

cfg.defaults = {};
cfg.defaults.id = 'id';
cfg.defaults.events = [ 'created', 'updated', 'patched', 'removed' ];
cfg.defaults.pagination = undefined;

cfg.google = {};
cfg.google.projectId = 'feathers-spanner-instance';
cfg.google.instanceId = 'feathers-test';
cfg.google.databaseId = 'feathers_db';
cfg.google.tableName = 'initial';

module.exports = cfg;