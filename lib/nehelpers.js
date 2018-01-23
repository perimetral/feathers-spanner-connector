const insert = async (db, data) => {
	return new Promise((go, stop) => {
		db.insert(data, (e, next) => {
			if (e) return stop(e);
			return go(next);
		});
	});
};

const remove = async (db, data, opts) => {
	return new Promise((go, stop) => {
		db.remove(data, opts, (e) => {
			if (e) return stop(e);
			return go();
		});
	});
};

const clear = async (db) => {
	return new Promise((go, stop) => {
		db.remove({}, {
			multi: true,
		}, (e) => {
			if (e) return stop(e);
			return go();
		});
	});
};

const find = async (db, query, projection) => {
	return new Promise((go, stop) => {
		db.find(query, projection, (e, next) => {
			if (e) return stop(e);
			return go(next);
		});
	});	
};

const count = async (db, query) => {
	return new Promise((go, stop) => {
		db.count(query, (e, next) => {
			if (e) return stop(e);
			return go(next);
		});
	});	
};

module.exports = {
	insert,
	remove,
	clear,
	find,
	count,
};