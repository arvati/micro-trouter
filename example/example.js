const microTrouter = require('../lib');



const first = next => async (request, response, ...args) => {
    request.hello = 'world';
    return next(request, response, ...args);
};

const second = next => (request, response, ...args) => {
    request.foo = '...needs better demo 😔';
    //let oneMore = 'another one'
    //args.push(oneMore);
    return next(request, response, ...args);
};

module.exports = microTrouter()
    .use(first, second)
    .get('/users/:id', async (request, response) => {
        console.log(`~> Hello, ${request.hello}`);
        //res.end(`User: ${req.params.id}`);
        return `User: ${request.params.id}`
    })
    .compose
