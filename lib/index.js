
const {STATUS_CODES} = require('http');
const Router = require('trouter');
const regexparam = require('regexparam');
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
        this.cmps = {};
        this.microcompose = microCompose
		this.handle = this.handle.bind(this);
		this.onError = opts.onError || onError;
		this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { code:404, message:'Not Found on route' });
    }

    //for decorators
    use(base,...fns) {
        if (typeof base === 'function') {
            fns = fns.concat(base);
            base = '/'
		}
        this.cmps[base] = this.cmps[base].concat(
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
    connect(base,...fns) {
        if (typeof base === 'function') {
            fns = fns.concat(base);
            base = '/'
		}
        this.cmps[base] = this.cmps[base].concat(
                fns.map( (cur) =>
                next => async (request, response, ...args) => {
                    await new Promise(resolve => cur(req, res, resolve))
                    return next(request, response, ...args);
                }
            )
        )
        return this;
    }

    compose(base,...fns) {
        if (typeof base === 'function') {
            fns = fns.concat(base);
            base = '/'
		}
		this.cmps[base] = this.cmps[base].concat(fns);
		return this;
    }

    async handle (request, response, ...args) {
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
            for (const hnd in handlers) {
                returned = await handlers[hnd](request, response, ...args)
                    .catch(e => { this.onError( e, request, response, ...args) });
                if (returned !== undefined || response.headersSent) break;
            }
            if (returned !== undefined && !response.headersSent) return returned;
        }
        let wares = [];
        for (const base in this.cmps) {
            if (this.cmps.hasOwnProperty(base)) {
                if (regexparam(base, true).pattern.test(request.pathname)) wares = wares.concat(this.cmps[base])
            }
        }
        return await this.microcompose(...wares)(mainHandler)(request, response, ...args)
                .catch(e => { this.onError( e, request, response, ...args) });
    }
}
module.exports = opts => new Trouter(opts);
