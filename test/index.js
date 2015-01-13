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
    var intercept = require("../");

    var Module = require("module");
    var oldRequire = Module.prototype.require;

    Module.prototype.require.should.equal(oldRequire);
    intercept.attach();
    Module.prototype.require.should.not.equal(oldRequire);
    intercept.detach();
    Module.prototype.require.should.equal(oldRequire);
  });

  it("doesn't fail if intercepting is active but no listener", function () {
    var intercept = require("..");
    intercept.attach();
    (function () {
      require("path").should.be.ok();
    }).should.not.throw();
    intercept.detach();
  });

});

function checkCalculator (calc) {
  return ["add", "subtract", "multiply", "divide"]
    .every(calc.hasOwnProperty.bind(calc));
}

describe('intercepting require()', function () {
  var intercept = require("..");

  beforeEach(butt(intercept.attach, 0));
  afterEach(butt(intercept.detach, 0));

  it('invokes the listener when `require()` is invoked', function () {
    var called = false;
    function listener () {
      called = true;
    }
    intercept.setListener(listener);
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
    intercept.setListener(listener);
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
    intercept.setListener(listener);
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
    intercept.setListener(listener1);
    require("./malformed.js");

    intercept.resetListener();

    function listener2 (err, info) {
      (err instanceof Error).should.equal(true);
      should.exist(info);
      /cannot find module/i.test(err.message).should.equal(true);
      return true;
    }
    intercept.setListener(listener2);
    require("./no-exist.js");

  });

  it('throws the error if one is passed back from the listener', function () {
    intercept.setListener(noop);
    (function () {
      require("./no-exist.js");
    }).should.throw(/cannot find module/i);
  });

  it('allows short circuiting', function () {
    intercept.detach();
    intercept.attach(null, {
      shortCircuit: true
    });
    var result = {works: true};
    intercept.setListener(function () {
      return result;
    });
    var exported = require("./no-exist");
    exported.should.equal(result);
  });

  it('allows short circuiting with mathing', function () {
    intercept.detach();

    var calc = require("./calculator");

    intercept.attach(null, {
      shortCircuit: true,
      shortCircuitMatch: function (info) {
        return (/exist/).test(info.absPath);
      }
    });

    var result = {works: true};

    intercept.setListener(function (original, info) {
      if (!info.shortCircuitSucceeded) {
        return original;
      }
      return result;
    });

    var exported = require("./no-exist");
    var reimportedCalc = require("./calculator");

    exported.should.equal(result);
    reimportedCalc.should.equal(calc);
  });

});
