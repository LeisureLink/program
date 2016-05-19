'use strict';

let Program = require('../');
let utils = require('../lib/utils');

let stdout = console.log.bind(console); // eslint-disable-line no-console
let stderr = console.error.bind(console); // eslint-disable-line no-console

Program.create(require('../package'))
  .spec([], true)
  .run((prg, opt) => {
    stdout(utils.inspect(opt));
  })
  .catch(err => stderr('' + (err.stack || err)));
