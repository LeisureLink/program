'use strict';

const assert = require('assert-plus');
const fs = require('fs');
const promisify = require('es6-promisify');

const fsStat = promisify(fs.stat);

function assertIsRegularFile(filePath) {
  return fsStat(filePath)
    .then(stat => {
      assert.ok(stat.isFile(), `path must be a regular file: ${filePath}`);
      return filePath;
    });
}

function assertIsDirectory(dir) {
  return fsStat(dir)
    .then(stat => {
      assert.ok(stat.isDirectory(), `path must be a directory: ${dir}`);
      return dir;
    });
}

module.exports = {
  assertIsRegularFile,
  assertIsDirectory
};
