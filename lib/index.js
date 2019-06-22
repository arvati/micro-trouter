
const {STATUS_CODES} = require('http');
const Router = require('trouter');
const microCompose = require('micro-compose')


function onError(error, request, response, ...Args) {
    let code = (response.statusCode = error.code || error.status || 500);
    const err = new Error(error.length && error || error.message || STATUS_CODES[code])
    err.statusCode = code
    throw err
}


class Trouter extends Router {
	constructor(opts={}) {
		super(opts);
		this.wares = [];
		this.compose = this.compose.bind(this);
		this.onError = opts.onError || onError; // catch-all handler
		this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { code:404 });
    }

    use(...fns) {
        // all functions together
		this.wares = this.wares.concat(fns);
		return this; // chainable
	}

    async compose (request, response, ...args) {
        // Find a route definition
        let idx = request.url.indexOf('?', 1)
        let pathname = ( idx !== -1) ? request.url.substring(0, idx) : request.url
        let obj=this.find(request.method, pathname);
        let middlewares=[]
        if (obj) {
			middlewares = obj.handlers;
			request.params = obj.params;
        }
        if (middlewares.length === 0) {
			middlewares.push(this.onNoMatch);
        }
        return await microCompose(...this.wares)(middlewares[0]


            )(request, response, ...args)
        // todo: call sequentially every middleware
        let returned = undefined
        for (const mwFn in middlewares) {
            returned = await middlewares[mwFn](request, response, ...args);
            // If there is a response or a response was sent to the client break the for block
            if (returned !== undefined || response.headersSent) break;
        }
        if (returned !== undefined && !response.headersSent) {
            return returned;
        }
    }
}

module.exports = opts => new Trouter(opts);
