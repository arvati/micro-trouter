
const {STATUS_CODES} = require('http');
const Router = require('trouter');
const microCompose = require('micro-compose')



function onError(error, request, response, ...Args) {
    let code = error.code || error.status || 500;
    const err = new Error(error.length && error || error.message || STATUS_CODES[code])
    err.statusCode = code
    throw err
}


class Trouter extends Router {

	constructor(opts={}) {
        super(opts);
        this.microcompose = microCompose
        this.wares = [];
        this.cmps = [];
		this.handler = this.handler.bind(this);
		this.onError = opts.onError || onError; // catch-all mainHandler
		this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { code:404, message:'Not Found on route' });
    }

    //for decorators
    use(...fns) {
        //this.wares = this.wares.concat(fns);
        let cmps = fns.map( (cur) =>
            next => async (request, response, ...args) => {
                await cur(request, response, ...args)
                return next(request, response, ...args);
            }
        )
        this.cmps = this.cmps.concat(cmps)
		return this;
    }

    // for tradicional express like middleware
    middleware(...fns) {
        let cmps = fns.map( (cur) =>
            next => async (request, response, ...args) => {
                await new Promise(resolve => cur(req, res, resolve))
                return next(request, response, ...args);
            }
        )
        this.cmps = this.cmps.concat(cmps)
        return this;
    }

    compose(...fns) {
		this.cmps = this.cmps.concat(fns);
		return this;
    }

    async handle (request, response, ...args) {
        // Find a route definition
        let url = request.originalUrl || request.url;
        let idx = url.indexOf('?', 1)
        let pathname = ( idx !== -1) ? url.substring(0, idx) : url
        let routed=this.find(request.method, pathname);
        let matched=[];
        if (routed) {
			matched = routed.handlers;
			request.params = routed.params;
        }
        if (matched.length === 0) {
			matched.push(this.onNoMatch);
        }
        let fns=this.wares
        fns = fns.concat(matched)
        const mainHandler = async (request, response, ...args) => {
            let returned = undefined
            for (const fn in fns) {
                returned = await fns[fn](request, response, ...args);
                // If there is a response or a response was sent to the client break the for block
                if (returned !== undefined || response.headersSent) break;
            }
            if (returned !== undefined && !response.headersSent) {
                return returned;
            }
        }
        return await this.microcompose(...this.cmps)(mainHandler)(request, response, ...args)
        // todo: call sequentially every middleware

    }
}

module.exports = opts => new Trouter(opts);
