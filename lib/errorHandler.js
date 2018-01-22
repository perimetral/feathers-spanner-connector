
const errors = require('@feathersjs/errors');

const handler = (e) => {
	if (e.name === 'SpannerError') {
		throw new errors.GeneralError(e, {
			ok: e.ok,
			code: e.code
		});
	};

	throw e;
};

module.exports = handler;