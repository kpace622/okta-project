const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { ExpressOIDC } = require('@okta/oidc-middleware');

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
    saveUninitialized: false
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

  app.get('/', (req, res) => {
    res.send({message: 'Server is up'})
  })

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
