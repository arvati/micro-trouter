const micro = require('micro');
const request = require('supertest');
const microTrouter = require('../lib');

describe('General use of micro-trouter', async () => {
    describe('Use of Midlewares, Compose Functions and Decorators', () => {
        before( async () => {
            one =  async (req, res) => {
                req.hello = 'world';
            }
            two =  async (req, res) => {
                req.foo = '...needs better demo 😔';
            }
            first = next => async (request, response, ...args) => {
                request.hello = 'world';
                return next(request, response, ...args);
            };
            second = next => (request, response, ...args) => {
                request.foo = '...needs better demo 😔';
                let oneMore = 'another one'
                args.push(oneMore);
                return next(request, response, ...args);
            };

            this.microtrouter = microTrouter()
            .use(one, two)
            .compose(first, second)
            .get('/users/:id', async (request, response) => {
                console.log(`~> Hello, ${request.hello}`);
                response.end(`User: ${request.params.id}`);
                //return `User: ${request.params.id}`
            })
            .get('/demos/:id', async (request, response) => {
                console.log(`~> Really, ${request.foo}`);
                //response.end(`Demo: ${request.params.id}`);
                return `Demo: ${request.params.id}`
            })
        });

        it('Route with parameter - /users/123', (done) => {
            request.agent(micro(this.microtrouter.handler))
                .get('/users/123')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    console.info(res.text)
                    done();
                  });
        })
        it('Route with parameter - /demos/456', (done) => {
            request.agent(micro(this.microtrouter.handler))
                .get('/demos/456')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    console.info(res.text)
                    done();
                  });
        })
    })
})
