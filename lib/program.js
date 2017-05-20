'use strict';

const debug = require('debug')('program');
const assert = require('assert-plus');
const argh = require('argh');
const os = require('os');
const _ = require('lodash');
const load = require('./load');
const utils = require('./utils');

const $name = Symbol('name');
const $handler = Symbol('handler');
const $spec = Symbol('spec');
const $relaxed = Symbol('relaxed');

let stdout = console.log.bind(console); // eslint-disable-line no-console
let stderr = console.error.bind(console); // eslint-disable-line no-console

function buildOptionList(options) {
  if (Array.isArray(options)) {
    if (!_.find(options, { argv: '--help' })) {
      options.push({ argv: '--help', flag: true, description: 'Prints usage.' });
    }
    if (!_.find(options, { argv: '--version' })) {
      options.push({ argv: '--version', flag: true, description: 'Prints version.' });
    }
    let required = _.orderBy(_.filter(options, 'required'), 'argv');
    let optional = _.orderBy(_.filter(options, it => !it.required), 'argv');
    let res = required.reduce(
      (acc, it) => {
        let res = acc.concat(' ', it.argv);
        return (!it.flag) ? res.concat(' <', utils.camelcase(it.argv), '>') :
          res;
      }, '');
    return optional.reduce(
      (acc, it) => {
        let res = acc.concat(' [', it.argv);
        return (!it.flag) ? res.concat(' <', utils.camelcase(it.argv), '>]') :
          res.concat(']');
      }, res);
  }
  return '';
}

class Command {

  constructor(name, handler, spec, relaxed) {
    this[$name] = name;
    this[$handler] = handler;
    this[$spec] = spec;
    this[$relaxed] = relaxed;
  }

  get name() {
    return this[$name];
  }

  get spec() {
    return this[$spec];
  }

  get relaxed() {
    return this[$relaxed];
  }

  execute(program, options) {
    return new Promise((resolve, reject) => {
      try {
        debug(`executing${(this.name)?' '+this.name:''}`);
        resolve(this[$handler](program, options));
      } catch (err) {
        reject(err);
      }
    });
  }

}

const $pkg = Symbol('pkg');
const $raw = Symbol('raw');
const $parsed = Symbol('parsed');
const $validations = Symbol('validations');
const $commands = Symbol('commands');

function expectCommand(name, spec, handler) {
  assert.string(name, 'name');
  if (typeof(spec) === 'function') {
    handler = spec;
    spec = undefined;
  }
  assert.func(handler, 'handler');
  assert.optionalObject(spec, 'spec');
  return new Command(name, handler, spec);
}

class Program {

  constructor(pkg, raw) {
    assert.object(pkg, 'pkg');
    assert.optionalArrayOfString(raw, 'raw');
    this[$pkg] = pkg;
    this[$raw] = raw;
  }

  get raw() {
    let res = this[$raw];
    // clone the raw args since the `argh` module mutates it.
    return res ? res.slice(0) : undefined;
  }

  get parsed() {
    let res = this[$parsed];
    if (!res) {

      this[$parsed] = res = argh(this.raw);
    }
    return _.cloneDeep(res); // immutable
  }

  prepareOptions(options) {
    return new Promise((resolve, reject) => {
      try {
        resolve(load(
          _.omit(options, 'argv'),
          this[$spec] || [],
          this[$relaxed],
          this[$validations]));
      } catch (err) {
        reject(err);
      }
    });
  }

  spec(spec, relaxed) {
    assert.arrayOfObject(spec);
    assert.optionalBool(relaxed);
    let other = Program.clone(this);
    other[$spec] = spec;
    other[$relaxed] = relaxed;
    return other;
  }

  validate(validations) {
    assert.object(validations, 'validations');
    let other = Program.clone(this);
    other[$validations] = validations;
    return other;
  }

  command(name, spec, handler) {
    let other = Program.clone(this);
    other[$commands] = (this[$commands] || []).concat(expectCommand(name, spec, handler));
    return other;
  }

  run(cmd) { // eslint-disable-line complexity
    assert.optionalFunc(cmd);
    try {
      cmd = (cmd) ? new Command('', cmd) : null;
      let options = this.parsed;
      if (typeof(options.version) === 'boolean' && options.version) {
        stdout(this[$pkg].version);
        return Promise.resolve();
      }
      if (typeof(options.help) === 'boolean' && options.help) {
        return Promise.resolve(this.usage());
      }
      if (options.argv) {
        let name = options.argv[0];
        let command = _.findLast(this[$commands], (it) => it.name === name);
        if (command) {
          if (command.spec && options.argv.length > 1) {
            return this.prepareOptions(options)
              .then(globals => load(
                  options.argv.split(1),
                  command.spec,
                  command.relaxed,
                  this[$validations])
                .then(options => _.extend(globals, options)))
              .catch(reason => {
                this.usage(reason);
                return Promise.reject(reason);
              })
              .then(command.execute.bind(command, this));
          }
          return this.prepareOptions(options)
            .catch(reason => {
              this.usage(reason);
              return Promise.reject(reason);
            })
            .then(command.execute.bind(command, this));
        }
      }
      if (!cmd) {
        throw new Error('Invalid operation; default command not specified.');
      }
      return this.prepareOptions(options)
        .catch(reason => {
          this.usage(reason);
          return Promise.reject(reason);
        })
        .then(cmd.execute.bind(cmd, this));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  usage(err) {
    if (err) {
      stderr(err.message + os.EOL);
      debug(err.stack + os.EOL);
    }
    let pkg = this[$pkg];
    let spec = this[$spec];
    try {
      let name = (pkg.bin && typeof pkg.bin === 'object') ?
        Object.keys(pkg.bin)[0] :
        pkg.name;
      stdout(`${ name } v${ pkg.version } - ${ pkg.description }${os.EOL}`);
      stdout(`Usage: ${ name } ${ buildOptionList(spec) }`);
    } catch (err) {
      debug(err.stack);
    }
  }

}

function clone(source) {
  assert.ok(source instanceof Program, 'source (Program) is required');
  let other = new Program(source[$pkg], source[$raw]);
  other[$commands] = source[$commands];
  other[$spec] = source[$spec];
  other[$relaxed] = source[$relaxed];
  other[$validations] = source[$validations];
  return other;
}

function create(pkg, raw) {
  assert.object(pkg, 'pkg');
  assert.optionalArrayOfString(raw, 'raw');
  return new Program(pkg, raw);
}

Program.create = create;
Program.clone = clone;

module.exports = Program;
