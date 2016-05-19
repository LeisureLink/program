'use strict';

let util = require('util');

function camelcase(flag) {
  let i = -1;
  flag = (flag.startsWith('-')) ? flag : '-'.concat(flag);
  return flag.split('-').reduce((str, word) => {
    if (word) {
      return (++i) ?
        str + word[0].toUpperCase() + word.slice(1) :
        word;
    }
    return str;
  });
}

function inspect(o, privates, levels) {
  privates = (privates === undefined) ? false : privates;
  levels = (levels === undefined) ? 9 : levels;
  return util.inspect(o, false, levels);
}

function looksLikePromise(it) {
  return typeof(it) === 'object' && typeof(it.then) === 'function';
}

module.exports = {
  camelcase,
  inspect,
  looksLikePromise
};
