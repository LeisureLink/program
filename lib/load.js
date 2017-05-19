'use strict';

const debug = require('debug')('program:load');
const assert = require('assert-plus');
const ptr = require('json-ptr');
const _ = require('lodash');
const utils = require('./utils');

const builtinValidations = require('./validations');


function load(input, spec, relaxed, validations, errors) {
  assert.object(input, 'input');
  assert.optionalArrayOfObject(spec, 'spec');
  assert.optionalObject(validations, 'validations');
  assert.optionalFunc(errors, 'errors');
  spec = spec || [];
  validations = _.extend({}, builtinValidations, validations);
  errors = errors || function(err) {
    throw err;
  };
  input = Object.keys(input).reduce((acc, k) => {
    let argument = '--' + k;
    let value = input[k];
    acc[utils.camelcase(k)] = { argument, value };
    return acc;
  }, {});
  let options = {};
  return Promise.all(spec.reduce((acc, it) => { // eslint-disable-line complexity
    let key = utils.camelcase(it.argv);
    let item = input[key];
    let value;
    if (item) {
      value = input[key].value;
      delete input[key];
    }
    if (value !== undefined) {
      debug(`Option from argv (${it.argv}): ${value}`);
    } else if (it.env) {
      value = process.env[it.env];
      if (value !== undefined) {
        debug(`Option from environment (${it.env}): ${value}`);
      } else if (it.def !== undefined) {
        value = it.def;
        debug(`Option from default (${it.argv}): ${value}`);
      }
    }
    if (value === undefined) {
      if (it.required) {
        let err = new Error(`ERROR - missing required option: ${it.argv}.
  Use either the command line argument: ${it.argv}
     or specify an environement variable: ${it.env}

`);
        errors(err);
        return Promise.reject(err);
      }
    } else {
      if (it.validate) {
        let vargs = Array.isArray(it.validate) ? it.validate : [it.validate];
        let validate = validations[vargs[0]];
        if (!validate) {
          let err = new Error(`Unknown validation for ${it.argv}: ${vargs[0]}.`);
          errors(err);
          return Promise.reject(err);
        }
        vargs[0] = value;
        let future;
        try {
          future = validate.apply(null, vargs);
          if (!utils.looksLikePromise(future)) {
            future = Promise.resolve(future);
          }
        } catch (err) {
          future = Promise.reject(err);
        }
        acc.push(future.then(value => {
          if (it.ptr) {
            ptr.set(options, it.ptr, value, true);
          } else {
            options[key] = value;
          }
        }));
      } else {
        if (it.ptr) {
          ptr.set(options, it.ptr, value, true);
        } else {
          options[key] = value;
        }
      }
    }
    return acc;
  }, [])).then(() => {
    let unexpected = Object.keys(input);
    if (unexpected && unexpected.length) {
      if (!relaxed) {
        let err = new Error(`Undefined argument: ${input[unexpected[0]].argument}`);
        errors(err);
        return Promise.reject(err);
      }
      options = unexpected.reduce((acc, it) => {
        acc[it] = input[it].value;
        return acc;
      }, options);
    }
    return options;
  });
}

module.exports = load;
