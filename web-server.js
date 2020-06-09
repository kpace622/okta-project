const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const KnexSessionStore = require("connect-session-knex")(session);
const store = new KnexSessionStore(/* options here */)
const { ExpressOIDC } = require('@okta/oidc-middleware');
const bodyParser = require('body-parser')

module.exports = function WebServer(config, extraOidcOptions) {

  const oidc = new ExpressOIDC(Object.assign({
    issuer: config.oidc.issuer,
    client_id: config.oidc.clientId,
    client_secret: config.oidc.clientSecret,
    appBaseUrl: config.oidc.appBaseUrl,
    scope: config.oidc.scope,
  }, extraOidcOptions || {}));

  const TESTENV = path.resolve(__dirname, "testenv");
  if (fs.existsSync(TESTENV)) {
    const envConfig = dotenv.parse(fs.readFileSync(TESTENV));
    Object.keys(envConfig).forEach((k) => {
      process.env[k] = envConfig[k];
    });
  }

  const app = express();

  var SERVER_SECRET = process.env.SERVER_SECRET;

  app.use(session({
    secret: SERVER_SECRET,
    resave: true,
    saveUninitialized: false,
    store: store
  }));

  // Provide the configuration to the view layer because we show it on the homepage
  const displayConfig = Object.assign(
    {},
    config.oidc,
    {
      clientSecret: '****' + config.oidc.clientSecret.substr(config.oidc.clientSecret.length - 4, 4)
    }
  );

  app.locals.oidcConfig = displayConfig;

  app.use(oidc.router);
  app.use(bodyParser.json());

  app.get('/', (req, res) => {
    res.send({message: 'Server is up'})
  })

  app.post('/api/view', (/*RESTAPIRequest*/ req, /*RESTAPIResponse*/ res) => {
    if(req.body.challenge) {
        res.status(200);
        res.contentType('text/plain');
        console.log(req.body)
        res.send(req.body.challenge)
    } else {
      res.send('Slack Payload: ' + JSON.stringify(req.body));
    }
})


  // app.get('/api/view', (req, res) => {
  //   req.body.
  // })

  oidc.on('ready', () => {
    // eslint-disable-next-line no-console
    app.listen(config.port, () => console.log(`App started on port ${config.port}`));
  });

  oidc.on('error', err => {
    // An error occurred with OIDC
    // eslint-disable-next-line no-console
    console.error('OIDC ERROR: ', err);

    // Throwing an error will terminate the server process
    // throw err;
  });
};
