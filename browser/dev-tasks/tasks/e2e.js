var path = require('path');
var _ = require('lodash');

var chalk = require('chalk');

var ctx = require('../context');

var helper = require('../helper');
var $ = helper.$;
var myTasks = [];

// var usage = 'USAGE: `gulp e2e --<pform>`` where <pform> in [java|node]';
var args = {
  reporter: 'pretty',
  selenium: 'local',
  // sauce: false,
  toFile: false,
  middleTier: 'external', // or 'java' or 'node',
  browser: 'phantomjs', // or 'chrome' or 'firefox' or 'internet explorer'
  os: undefined
};

_.merge(args, require('yargs').argv);

if (args.sauce && args.selenium !== 'external') {
  args.selenium = 'sauce';
}

var seleniumStart = function (cb) {
  var seleniumHandler;
  switch (args.selenium) {
    case 'external':
      $.util.log('using **external** Selenium server');
      seleniumHandler = require('../e2e/seleniumExternal');
      break;
    case 'sauce':
      $.util.log('using **self-tunnelled** SauceLabs Selenium server');
      seleniumHandler = require('../e2e/seleniumSauce');
      break;
    case 'local':
      $.util.log('using **local** Selenium server');
      seleniumHandler = require('../e2e/seleniumLocal');
      break;
    default:
      return cb(new Error(
        'parameter `--selenium` must be one of [external|sauce|local]'
      ));
  }
  return seleniumHandler.start(args, cb);
};

var middleTierStart = function (cb) {
  var middleTierHandler;
  switch (args.middleTier) {
    case 'external':
      middleTierHandler = require('../e2e/middleTierExternal');
      break;
    case 'java':
      middleTierHandler = require('../e2e/middleTierJava');
      break;
    case 'node':
      return cb(new Error('Node.js middle-tier testing not yet implmeneted'));
    default:
      return cb(new Error(
        'parameter `--selenium` must be one of [external|sauce|local]'
      ));
  }
  middleTierHandler.start(args, cb);
};


myTasks.push({
  name: 'selenium',
  func: seleniumStart
});

myTasks.push({
  name: 'middle-tier',
  func: middleTierStart
});

var protractorHandler;
var protractorRun = function (cb) {
  protractorHandler = require('../e2e/protractor');
  protractorHandler.go(args, cb);
};

myTasks.push({
  name: 'e2e',
  deps: ['build', 'selenium', 'middle-tier'],
  func: function (cb) {
    try {
      ctx.startServer(
        ctx.paths.buildDir,
        ctx.options.envs.e2e.addresses.webApp.port
      );

      protractorRun(function () {
        process.kill('SIGINT');
      });
      cb();
    }
    catch (err) {
      cb(err);
    }
  }
});

module.exports = myTasks;
