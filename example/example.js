const microTrouter = require('../lib');

const one =  async (req, res) => {
    req.hello = 'world';
}

const two =  async (req, res) => {
    req.foo = '...needs better demo 😔';
}

microTrouter()
  .use(one, two)
  .get('/users/:id', async (req, res) => {
    console.log(`~> Hello, ${req.hello}`);
    res.end(`User: ${req.params.id}`);
})

module.exports = microTrouter().handler
