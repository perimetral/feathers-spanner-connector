const cfg = global.cfg = require('../config');

const Spanner = require('@google-cloud/spanner');
const Nedb = require('nedb');
const uniqid = require('uniqid');
const util = require('util');

const ehandler = require('./errorHandler');
const nehelpers = require('./nehelpers');

class Page {
	constructor (total, limit, skip, data) {
		this.total = total;
		this.limit = limit;
		this.skip = skip;
		this.data = data;
	}	
};

const loadInternal = async (db) => {
	return new Promise((go, stop) => {
		db.loadDatabase((e) => {
			if (e) return stop(e);
			return go(db);
		});
	});
};

const processQuery = async (query) => {
	let clean = Object.assign({}, query);
	delete clean.$limit;
	delete clean.$sort;
	delete clean.$select;
	delete clean.$search;
	let selectors = {};
	if ('$select' in query) {
		for (let i in query.$select) selectors[query.$select[i]] = 1;
	};
	return {
		q: clean,
		flags: {
			limit: '$limit' in query ? query.$limit : null,
			sort: '$sort' in query ? query.$sort : null,
			select: '$select' in query ? selectors : null,
			skip: '$skip' in query ? query.$skip : null,
		},
	};
};

class Connector {
	constructor (opts) {
		if (! opts) throw new Error('OPTIONS MUST BE PROVIDED');
		this.initialized = false;

		this.opts = opts;
		this.id = 'id' in opts ? opts.id : cfg.defaults.id;
		this.events = 'events' in opts ? Object.assign({}, cfg.defaults.events, opts.events) : cfg.defaults.events;
		this.pagination = ('pagination' in opts && opts.pagination) ? Object.assign({}, opts.pagination) : cfg.defaults.pagination;
		if (this.pagination && (typeof this.pagination === typeof {})) {
			if (! this.pagination.default) this.pagination.default = cfg.defaults.paginationDefault;
			if (! this.pagination.max) this.pagination.max = cfg.defaults.paginationMax;
		};

		this.projectId = 'projectId' in opts ? opts.projectId : cfg.google.projectId;
		this.instanceId = 'instanceId' in opts ? opts.instanceId : cfg.google.instanceId;
		this.databaseId = 'databaseId' in opts ? opts.databaseId : cfg.google.databaseId;
		this.tableName = 'tableName' in opts ? opts.tableName : cfg.google.tableName;

		this._spanner = 'spanner' in opts ? opts.spanner : null;
		this._instance = 'instance' in opts ? opts.instance : null;
		this._db = 'db' in opts ? opts.db : null;
		this._table = 'table' in opts ? opts.table : null;

		this._nedb = new Nedb({
			inMemoryOnly: true,
			autoload: true
		});
	}
	async _sync () {
		await nehelpers.clear(this._nedb);
		let rows = await this._table.read({
			keySet: 'all'
		})[0];
		for (let i in rows) {
			await nehelpers.insert(this._nedb, 'toJSON' in rows[i] ? rows[i].toJSON() : rows[i]);
		};
		return;
	}
	async create (data, opts) {
		if (! this.db_initialized) return ehandler('DATABASE IS NOT INITIALIZED');
		if (typeof data === typeof {}) {
			if (! this.id in data) data[this.id] = uniqid();
		};
		if (Array.isArray(data)) data = data.map((x, i, ar) => {
			if (! this.id in x) x[this.id] = uniqid();
			return x;
		}, this);
		await this._table.insert(data);
		return data;
	}

	async _doQuery (query) {
		return new Promise(async (go, stop) => {
			let { q, flags } = await processQuery(query);
			if (flags.limit === 0) {
				await this._sync();
				return go(await nehelpers.count(q));
			};
			let initialRes = flags.select ? this._nedb.find(q, flags.select) : this._nedb.find(q);
			if (this.pagination) {
				await this._sync();
				let total = await nehelpers.count(q);
				if (flags.skip) initialRes = initialRes.skip(flags.skip);
				if (flags.limit) initialRes = initialRes.limit(Math.min(flags.limit, this.pagination.max));
				if (flags.sort) initialRes = initialRes.sort(flags.sort);
				initialRes.exec((e, res) => {
					if (e) return go(ehandler(e));
					return go(new Page(total, flags.limit, flags.skip, res));
				});
			} else {
				if (flags.sort) initialRes = initialRes.sort(flags.sort);
				initialRes.exec((e, res) => {
					if (e) return go(ehandler(e));
					return go(res);
				});
			};
		});
	}
	async get (id = 0, opts = {}) {
		if (! this.db_initialized) return ehandler('DATABASE IS NOT INITIALIZED');
		try {
			return await this._db.run({
				sql: `SELECT * FROM ${opts.tableName || this.tableName} WHERE ${opts.id || this.id} = ${id}`
			})[0];
		} catch (e) {
			return ehandler(e);
		};
	}
	async find (opts = {}) {
		if (! this.db_initialized) return ehandler('DATABASE IS NOT INITIALIZED');
		let paginated = this.pagination || opts.pagination;
		if (! 'query' in opts) {
			try {
				return await this._db.run({
					sql: `SELECT * FROM ${this.tableName}`
				})[0];
			} catch (e) {
				return ehandler(e);
			};
		} else {
			return await this._doQuery(opts.query);
		};
	}
	async update (id, data, opts = {}) {
		if (! this.db_initialized) return ehandler('DATABASE IS NOT INITIALIZED');
		if (! id) return ehandler('NO ID FOR UPDATE METHOD PROVIDED');
		let updated = Object.assign({}, data, { [this.id]: id });
		await this._table.replace(updated);
		return updated;
	}
	async patch (id, data, opts = {}) {
		if (! this.db_initialized) return ehandler('DATABASE IS NOT INITIALIZED');
		if (id) {
			let patched = Object.assign({}, data, { [this.id]: id });
			await this._table.update(patched);
			return patched;
		} else if ('query' in opts) {
			let res = await this._doQuery(opts.query);
			if (Page.prototype.isPrototypeOf(res)) {
				res.data = res.data.map((x, i, ar) => {
					return Object.assign({}, x, data);
				});
				await this._table.update(res.data);
			} else {
				res = res.map((x, i, ar) => {
					return Object.assign({}, x, data);
				});
				await this._table.update(res);
			};
			return res;
		} else return ehandler('NOTHING TO PATCH');
	}
	async remove (id, opts = {}) {
		if (! this.db_initialized) return ehandler('DATABASE IS NOT INITIALIZED');
		if (id) {
			return await this._table.deleteRows([ id ]);
		} else if ('query' in opts) {
			let res = await this._doQuery(opts.query);
			if (Page.prototype.isPrototypeOf(res)) {
				res.data = res.data.filter((x, i, ar) => { return this.id in x; });
				return await this._table.deleteRows(res.data);
			} else {
				res = res.filter((x, i, ar) => { return this.id in x; });
				return await this._table.deleteRows(res);
			};
		} else return ehandler('NOTHING TO DELETE');
	}
	async setup (app, path) {
		this.app = app;
		if (! this._spanner) this._spanner = Spanner({ projectId: this.projectId });
		if (! this._instance) this._instance = this._spanner.instance(this.instanceId);
		if (! this._db) this._db = this._instance.database(this.databaseId);
		if (! await this._db.exists()) return ehandler('NO SUCH DATABASE');
		if (! this._table) this._table = this._db.table(this.tableName);
		this._nedb = await loadInternal(this._nedb);

		this.db_initialized = true;
	}
	async cleanup (noforce = true) {
		if ((! this.db_initialized) && noforce) return ehandler('DATABASE IS NOT INITIALIZED');
		return new Promise(async (go, stop) => {
			this.db_initialized = false;
			try {
				await nehelpers.clear(this._nedb);
			} catch (e) {
				return stop(`GARBAGE COLLECTION FAILED: ${util.inspect(e)}`);
			};
			this._nedb = undefined;
			this._db.close((e) => {
				if (e) return stop(`GARBAGE COLLECTION FAILED: ${util.inspect(e)}`);
				return go();
			});
		});
	}
};

module.exports = (opts) => {
	return new Connector(opts);
};

module.exports.Connector = Connector;