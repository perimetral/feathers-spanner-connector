const cfg = {};
cfg.defaults = {};
cfg.google = {};

//	string: ID field name
cfg.defaults.id = 'id';

//	array of strings: default service events
cfg.defaults.events = [ 'created', 'updated', 'patched', 'removed' ];

//	boolean: default pagination behavior
cfg.defaults.pagination = false;

//	number: how much to show if pagination is turned on
cfg.defaults.paginationDefault = 100;

//	number: top limit of how much to show if pagination is turned on
cfg.defaults.paginationMax = 300;

//	strings: Google Spanner entities naming
//		please notice each of listed below must exist before init
cfg.google.projectId = 'feathers-spanner-instance';
cfg.google.instanceId = 'feathers-test';
cfg.google.databaseId = 'feathers_db';
cfg.google.tableName = 'initial';

module.exports = cfg;