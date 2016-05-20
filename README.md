# prg (program)

A simplified, promise-style CLI utility for programs written in nodejs.

> Initial 0.1.0 is underdocumented but functional; you'll have to dig through the tests for an accurate picture of its use.

Istanbul coverage report says:

```text
=============================== Coverage summary ===============================
Statements   : 74.19% ( 161/217 )
Branches     : 51.14% ( 45/88 )
Functions    : 75% ( 18/24 )
Lines        : 74.42% ( 160/215 )
================================================================================
```

... so there is a little ways to go yet.

## Install

```bash
npm install prg
```

## Use

**es5**
```javascript
var program = require('prg');
```

**es6**
```javascript
import program from 'prg';
```

### Example

```javascript
#!/usr/bin/env node

'use strict';

let prg = require('prg');
let pkg = require('./package');
let validate = require('./lib/validate');
let Service = require('./lib/service');

let stderr = console.error.bind(console);

// Specify the arguments we expect, ours are specified in the package...
let spec = pkg.config.options;

// Always provide your package, it is used to gen help/usage.
prg.create(pkg)
  // The spec also contributes to help/usage -- but it is optional.
  .spec(spec)
  // This simple example only runs a 'main' function/command;
  //   args are parsed from the command line and prepared in an
  //   options object according to your spec.
  .run((program, options) =>
    // its a good idea to provide your own last minute validation
    validate(options)
    // but eventually you just want to run your program.
    .then(options => {
      let service = new Service(options);
      service.on('error', stderr);
      process.on('SIGTERM', () => service.terminate());
      process.on('SIGINT', () => service.interrupt());
      return service.start();
    })
    // oh, and it is always a good idea to tell the user about errors.
    .catch(err => program.usage(err))
  )
  .catch(err => stderr('' + (err.stack || err)));
```

### Specs

Specs are important to `prg` because they convey what is expected when parsing the command line arguments.

* `argv` &ndash; a long-form command line parameter such as `--docker-tls-path`
* `def` &ndash; contains the option's default value.
* `env` &ndash; the name of an environement variable that supplies the option; e.g. `DOCKER_TLS_PATH`.
* `flag` &ndash; indicates whether the option is a flag.
* `ptr` &ndash; a JSON Pointer indicating the location on the `options` object where the value should reside such as `/docker/tls/path`.
* `required` &ndash; indicates whether the option is required.
* `validate` &ndash; the name of a built-in or user-supplied validation function.

## License

[MIT](https://github.com/LeisureLink/program/blob/master/LICENSE)
