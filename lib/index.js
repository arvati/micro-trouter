
const {STATUS_CODES} = require('http');
const Router = require('trouter');
const microCompose = require('micro-compose')

function onError(error, request, response, ...Args) {
    let code = error.statusCode || error.status || error.code || 500;
    const err = new Error(error.length && error || error.message || STATUS_CODES[code])
    err.statusCode = code
    throw err
}


class Trouter extends Router {

	constructor(opts={}) {
        super(opts);
        this.cmps = [];
        this.microcompose = microCompose
		this.handler = this.handler.bind(this);
		this.onError = opts.onError || onError;
		this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { code:404, message:'Not Found on route' });
    }

    //for decorators
    use(...fns) {
        this.cmps = this.cmps.concat(
                fns.map( (cur) =>
                next => async (request, response, ...args) => {
                    await cur(request, response, ...args)
                    return next(request, response, ...args);
                }
            )
        )
		return this;
    }

    // for connect middleware
    connect(...fns) {
        this.cmps = this.cmps.concat(
                fns.map( (cur) =>
                next => async (request, response, ...args) => {
                    await new Promise(resolve => cur(req, res, resolve))
                    return next(request, response, ...args);
                }
            )
        )
        return this;
    }

    compose(...fns) {
		this.cmps = this.cmps.concat(fns);
		return this;
    }
    
    async handler (request, response, ...args) {
        if (!request.pathname) {
            let url = request.originalUrl || request.url;
            let idx = url.indexOf('?', 1)
            request.pathname = ( idx !== -1) ? url.substring(0, idx) : url
        }
        let {handlers, params} = this.find(request.method, request.pathname);
        request.params = params
        if (handlers.length === 0) handlers.push(this.onNoMatch);
        const mainHandler = async (request, response, ...args) => {
            let returned = undefined
            for (const fn in handlers) {
                returned = await handlers[fn](request, response, ...args);
                if (returned !== undefined || response.headersSent) break;
            }
            if (returned !== undefined && !response.headersSent) return returned;
        }
        return await this.microcompose(...this.cmps)(mainHandler)(request, response, ...args)
    }
}
module.exports = opts => new Trouter(opts);
