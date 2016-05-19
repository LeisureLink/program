'use strict';

const assert = require('assert');
const test = require('tape');
const Program = require('../');
const pkg = require('../package');

function catcher(work, fail) {
  try {
    work();
    throw new Error('should have failed');
  } catch (err) {
    fail(err);
  }
}

test('Program.ctor() fails when no arguements specified', t => {
  catcher(
    () => new Program(),
    err => {
      t.ok(err instanceof assert.AssertionError, 'error is an assertion error');
      t.equal(err.message, 'pkg (object) is required', 'pkg (object) is required');
      t.end();
    });
});

test('Program.ctor(pkg) fails when pkg is wrong type', t => {
  catcher(
    () => new Program(13.9),
    err => {
      t.ok(err instanceof assert.AssertionError, 'error is an assertion error');
      t.equal(err.message, 'pkg (object) is required', 'pkg (object) is required');
      t.end();
    });
});

test('Program.ctor(pkg) succeeds when package specified', t => {
  t.doesNotThrow(() => {
    // Package is required; it is used to gen help/usage.
    new Program(pkg);
    t.end();
  });
});

test('Program.ctor(pkg, raw) fails when raw is wrong type', t => {
  catcher(
    () => new Program(pkg, 13.10),
    err => {
      t.ok(err instanceof assert.AssertionError, 'error is an assertion error');
      t.equal(err.message, 'raw ([string]) is required', 'raw ([string]) is required');
      t.end();
    });
});

test('preferred Program.create() fails when no arguements specified', t => {
  catcher(
    () => Program.create(),
    err => {
      t.ok(err instanceof assert.AssertionError, 'error is an assertion error');
      t.equal(err.message, 'pkg (object) is required', 'pkg (object) is required');
      t.end();
    });
});

test('preferred Program.create() fails when pkg is wrong type', t => {
  catcher(
    () => Program.create(13.9),
    err => {
      t.ok(err instanceof assert.AssertionError, 'error is an assertion error');
      t.equal(err.message, 'pkg (object) is required', 'pkg (object) is required');
      t.end();
    });
});

test('preferred Program.create(pkg) succeeds when package specified', t => {
  t.doesNotThrow(() => {
    // Package is required; it is used to gen help/usage.
    let program = Program.create(pkg);
    t.ok(program instanceof Program, 'returns instanceof Program');
    t.end();
  });
});

test('preferred Program.create(pkg, raw) fails when raw is wrong type', t => {
  catcher(
    () => new Program(pkg, 13.10),
    err => {
      t.ok(err instanceof assert.AssertionError, 'error is an assertion error');
      t.equal(err.message, 'raw ([string]) is required', 'raw ([string]) is required');
      t.end();
    });
});

test('.run(cmd) throws when raw argument is undefined', t => {
  // An argument but no spec. Oops!
  Program.create(pkg, ['--willing-and-able'])
    .run(() => {
      t.fail('should have thrown');
    })
    .catch(err => {
      t.equal(err.message,
        'Undefined argument: --willing-and-able',
        'Undefined argument: --willing-and-able');
      t.end();
    });
});


test('.run(cmd) does not throw when arguement undefined but relaxed', t => {
  Program.create(pkg, ['--willing-and-able'])
    .spec([], true)
    .run((program, options) => {
      // arguments are camelcased when assigned to options:
      console.dir(options);
      t.equal(options.willingAndAble, true, 'options has willingAndAble property');
      t.end();
    })
    .catch(err => {
      t.fail(`should succeed but got error: ${''+err}`);
    });
});

test('.run(cmd) does not throw when arguement defined', t => {
  Program.create(pkg, ['--willing-and-able'])
    .spec([{ argv: '--willing-and-able', flag: true }])
    .run((program, options) => {
      // arguments are camelcased when assigned to options:
      t.equal(options.willingAndAble, true, 'options has willingAndAble property');
      t.end();
    })
    .catch(err => {
      t.fail(`should succeed but got error: ${''+err}`);
    });
});

test('.run(cmd) validates when validations provided (positive)', t => {
  function willing(who) {
    assert.ok(~['jim', 'jack'].indexOf(who), `${who} is unwilling`);
    return who; // validation must return the value
  }
  let expect = 'jim';
  Program.create(pkg, ['--willing-and-able', expect])
    .spec([{ argv: '--willing-and-able', validate: 'willing' }])
    .validate({ willing })
    .run((program, options) => {
      // arguments are camelcased when assigned to options:
      t.equal(options.willingAndAble, expect, `${expect} is willing`);
      t.end();
    })
    .catch(err => {
      t.fail(`should succeed but got error: ${''+err}`);
    });
});

test('.run(cmd) validates when validations provided (negative)', t => {
  function willing(who) {
    assert.ok(~['jim', 'jack'].indexOf(who), `${who} is unwilling`);
    return who; // validation must return the value
  }
  let expect = 'jane';
  Program.create(pkg, ['--willing-and-able', expect])
    .spec([{ argv: '--willing-and-able', validate: 'willing' }])
    .validate({ willing })
    .run(() => {
      t.fail('should fail');
    })
    .catch(err => {
      t.equal('' + err,
        'AssertionError: jane is unwilling',
        'AssertionError: jane is unwilling');
      t.end();
    });
});

test('.run(cmd) validates when validations promised (positive)', t => {
  function willing(who) {
    return new Promise((resolve) => {
      assert.ok(~['jim', 'jack'].indexOf(who), `${who} is unwilling`);
      resolve(who); // validation must return the value
    });
  }
  let expect = 'jim';
  Program.create(pkg, ['--willing-and-able', expect])
    .spec([{ argv: '--willing-and-able', validate: 'willing' }])
    .validate({ willing })
    .run((program, options) => {
      // arguments are camelcased when assigned to options:
      t.equal(options.willingAndAble, expect, `${expect} is willing`);
      t.end();
    })
    .catch(err => {
      t.fail(`should succeed but got error: ${''+err}`);
    });
});

test('.run(cmd) validates when validations promised (negative)', t => {
  function willing(who) {
    return new Promise((resolve) => {
      assert.ok(~['jim', 'jack'].indexOf(who), `${who} is unwilling`);
      resolve(who); // validation must return the value
    });
  }
  let expect = 'jane';
  Program.create(pkg, ['--willing-and-able', expect])
    .spec([{ argv: '--willing-and-able', validate: 'willing' }])
    .validate({ willing })
    .run(() => {
      t.fail('should fail');
    })
    .catch(err => {
      t.equal('' + err,
        'AssertionError: jane is unwilling',
        'AssertionError: jane is unwilling');
      t.end();
    });
});
