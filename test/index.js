/**
 * Created by Ralph Varjabedian on 11/14/14.
 */

'use strict';

var should = require('chai').should();

var butt = require('butt');

function noop () {}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function validateObj (target, validator) {
  Object.keys(validator).forEach(function (key) {
    if (!target.hasOwnProperty(key)) {
      throw new Error("Target object doesn't have key " + key);
    }

    if (validator[key] instanceof RegExp) {
      if (!validator[key].test(target[key])) {
        var msg = [
          "Target object's",
          key,
          "property didn't match RegExp",
          "\n",
          target[key]
        ].join(" ");
        throw new Error(msg);
      }
      return;
    }

    if (validator[key] !== target[key]) {
      var msg = [
        "Expected properties at key",
        key,
        "to be equal.",
        "\n",
        "Actual: ",
        target[key],
        "Expected: ",
        validator[key]
      ].join(" ");
      throw new Error(msg);
    }
  });
}

describe('replacing Module.prototype.require()', function() {

  it('attaches and detaches as expected', function() {
    var requireHook = require("../");

    var Module = require("module");
    var oldRequire = Module.prototype.require;

    Module.prototype.require.should.equal(oldRequire);
    requireHook.attach();
    Module.prototype.require.should.not.equal(oldRequire);
    requireHook.detach();
    Module.prototype.require.should.equal(oldRequire);
  });

});

function checkCalculator (calc) {
  return ["add", "subtract", "multiply", "divide"]
    .every(calc.hasOwnProperty.bind(calc));
}

describe('intercepting require()', function () {
  var requireHook = require("..");

  beforeEach(butt(requireHook.attach, 0));
  afterEach(butt(requireHook.detach, 0));

  it('invokes the listener when `require()` is invoked', function () {
    var called = false;
    function listener () {
      called = true;
    }
    requireHook.setListener(listener);
    var calc = require("./calculator.js");
    (checkCalculator(calc)).should.equal(true);
    called.should.equal(true);
  });

  it('passes the result and some info to the listener', function () {
    var calc, result, info;
    function listener (r, i) {
      result = r;
      info = i;
    }
    requireHook.setListener(listener);
    calc = require("./calculator");
    calc.should.equal(result);
    (checkCalculator(calc)).should.equal(true);

    var callingFileRe = new RegExp(escapeRegExp("intercept-require/test/index.js") + "$");
    var absPathRe = new RegExp(escapeRegExp("intercept-require/test/calculator.js") + "$");

    validateObj(info, {
      callingFile: callingFileRe,
      moduleId: "./calculator",
      extname: ".js",
      native: false,
      thirdParty: false,
      absPath: absPathRe,
      absPathResolvedCorrectly: true,
      testOnly: false,
      local: true,
    });
  });

  it('allows the listener to pass back a value', function () {
    function listener () {
      return true;
    }
    requireHook.setListener(listener);
    var calculator = require("./calculator.js");
    calculator.should.equal(true);
  });

  it('passes an error in the result spot if one occurs', function () {

    function listener1 (err, info) {
      (err instanceof Error).should.equal(true);
      should.exist(info);
      /unexpected identifier/i.test(err.message).should.equal(true);
      return true;
    }
    requireHook.setListener(listener1);
    require("./malformed.js");

    requireHook.resetListener();

    function listener2 (err, info) {
      (err instanceof Error).should.equal(true);
      should.exist(info);
      /cannot find module/i.test(err.message).should.equal(true);
      return true;
    }
    requireHook.setListener(listener2);
    require("./no-exist.js");

  });

  it('throws the error if one is passed back from the listener', function () {
    requireHook.setListener(noop);
    (function () {
      require("./no-exist.js");
    }).should.throw(/cannot find module/i);
  });

});
