"use strict";

var assert = require("assert");
var should = require("chai").should();

var butt = require("butt");

var CANNOT_FIND = /cannot find module/i;
var UNEXPECTED_IDENTIFIER = /unexpected identifier/i;

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

var Module = require("module");
var __require = Module.prototype.require;

var intercept = require("../lib/index");

describe("intercept-require", function () {

  // ensure we're back in a sane state after each test;
  afterEach(function () {
    assert(Module.prototype.require === __require, "Failed to call restore()")
  });

  describe("replacing Module.prototype.require()", function() {

    it("attaches and detaches as expected", function() {
      const Module = require("module");
      const oldRequire = Module.prototype.require;
      const restore = intercept(() => {});
      Module.prototype.require.should.not.equal(oldRequire);
      restore()
      Module.prototype.require.should.equal(oldRequire);
    });
  });

  function checkCalculator (calc) {
    return ["add", "subtract", "multiply", "divide"]
      .every(calc.hasOwnProperty.bind(calc));
  }

  describe("intercepting require()", function () {
    var intercept = require("../lib/index");

    it("invokes the listener when `require()` is invoked", function () {
      let called = false;
      const restore = intercept(() => {
        called = true
      });
      const calc = require("./calculator.js");
      (checkCalculator(calc)).should.equal(true);
      called.should.equal(true);
      restore();
    });

    it("passes the result and some info to the listener", function () {
      var calc, result, info;
      function listener (r, i) {
        result = r;
        info = i;
      }
      const restore = intercept(listener);
      calc = require("./calculator");
      calc.should.equal(result);
      (checkCalculator(calc)).should.equal(true);

      var callingFileRe = new RegExp(escapeRegExp("intercept-require/test/index-test.js") + "$");
      var absPathRe = new RegExp(escapeRegExp("intercept-require/test/calculator.js") + "$");

      validateObj(info, {
        callingFile: callingFileRe,
        moduleId: "./calculator",
        extname: ".js",
        native: false,
        thirdParty: false,
        absPath: absPathRe,
        absPathResolvedCorrectly: true,
        local: true,
      });

      restore();
    });

    it("allows the listener to pass back a value", function () {
      var restore = intercept(function () { return true; });
      var calculator = require("./calculator.js");
      calculator.should.equal(true);
      restore();
    });

    it("passes an as `info.error` if one occurs, and result and `null`", function () {
      var wasCalled1, wasCalled2, restore;

      function listener1 (result, info) {
        should.not.exist(result);
        info.error.should.be.instanceof(Error);
        UNEXPECTED_IDENTIFIER.test(info.error.message).should.equal(true);
        wasCalled1 = true;
      }

      restore = intercept(listener1)
      require("./malformed.js");
      wasCalled1.should.equal(true);

      restore();

      function listener2 (result, info) {
        should.not.exist(result);
        info.error.should.be.instanceof(Error);
        CANNOT_FIND.test(info.error.message).should.equal(true);
        wasCalled2 = true;
      }
      restore = intercept(listener2);
      require("./no-exist.js");
      wasCalled2.should.equal(true);

      restore();
    });

    it("when no listener is attached, `require` should act normally", function () {
      (function () {
        require("./no-exist.js");
      }).should.throw(CANNOT_FIND);

      (function () {
        require("./malformed");
      }).should.throw(UNEXPECTED_IDENTIFIER);

      var calc = require("./calculator");
      Object.keys(calc).sort().should.deep.equal(["add", "divide", "multiply", "subtract"]);
    });

    it("setListener throws when passed anything but a function", function () {
      (function () {
        intercept()
      }).should.throw(/argument must be a function/)
    });

    it("allows short circuiting", function () {
      const restore = intercept(function () {
        return result;
      }, {
        shortCircuit: true
      });
      var result = {works: true};
      var exported = require("./no-exist");
      exported.should.equal(result);
      restore();
    });

    it("allows short circuiting with matching", function () {
      var trueRequireResult = require("./calculator");

      var shortCircuitResult = {works: true};

      var timesShortCircuitedSucceeded = 0;
      var timesShortCircuitSkipped = 0;

      const restore = intercept(function (original, info) {
        if (info.didShortCircuit) {
          timesShortCircuitedSucceeded++;
          return shortCircuitResult;
        }
        timesShortCircuitSkipped++;
        return trueRequireResult;
      }, {
        shortCircuit: true,
        shortCircuitMatch: function (info) {
          return (/exist/).test(info.absPath);
        }
      });

      var didShortCircuit = require("./no-exist");
      var didntShortCircuit = require("./calculator");

      didShortCircuit.should.equal(shortCircuitResult);
      trueRequireResult.should.equal(didntShortCircuit);
      timesShortCircuitSkipped.should.equal(1);
      timesShortCircuitedSucceeded.should.equal(1);

      restore();
    });

  });
});
