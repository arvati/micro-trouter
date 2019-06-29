const microTrouter = require('../lib');

const one =  async (request, response) => {
    request.hello = 'world!';
}

const two =  async (request, response) => {
    request.foo = '...needs better demo 😔 !!';
}

const first = next => async (request, response, ...args) => {
    request.hello = 'world?';
    return next(request, response, ...args);
};

const second = next => async (request, response, ...args) => {
    request.foo = '...needs better demo 😔 ??';
    //let oneMore = 'another one'
    //args.push(oneMore);
    return next(request, response, ...args);
};

module.exports = microTrouter()
    .compose("demo", first, second)
    .use("users", one, two)
    .get('users/:id', async (request, response) => {
        console.log(`~> Hello, ${request.hello}`);
        //res.end(`User: ${req.params.id}`);
        return `User: ${request.params.id}`
    })
    .get('demo/:id', async (request, response) => {
        console.log(`~> Really, ${request.foo}`);
        //res.end(`User: ${req.params.id}`);
        return `Demo: ${request.params.id}`
    })
    .handle
