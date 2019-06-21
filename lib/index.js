
const {STATUS_CODES} = require('http');
const Router = require('trouter');
const { parse } = require('querystring');
const parser = require('@polka/url');


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
		this.parse = parser;
		this.handler = this.handler.bind(this);
		this.onError = opts.onError || onError; // catch-all handler
		this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { code:404 });
    }

    use(...fns) {
        // all functions together
		this.wares = this.wares.concat(fns);
		return this; // chainable
	}

    async handler (request, response, ...args) {
        let info = this.parse(request);
        // Find a route definition
        let obj=this.find(request.method, info.pathname);
        let fns=[]
        if (obj) {
			fns = obj.handlers;
			request.params = obj.params;
        }
        if (fns.length === 0) {
			fns.push(this.onNoMatch);
        }
        let middlewares=this.wares
        middlewares = middlewares.concat(fns);
        if (middlewares.length > 0) {
            request.path = info.pathname
            request.originalUrl = request.originalUrl || request.url;
            request.search = info.search;
            request.query = parse(info.query);
            // call sequentially every middleware
            let returned = undefined
            for (let index = 0; index < middlewares.length; ++index) {
                returned = await middlewares[index](request, response, ...args);
                // If there is a response or a response was sent to the client break the for block
                if (returned !== undefined || response.headersSent) break;
            }
            if (returned !== undefined && !response.headersSent) {
                return returned;
            }
        }
    }
}

module.exports = opts => new Trouter(opts);
