"use strict";

const assert = require("assert");
const Module = require("module");
const __require = Module.prototype.require;

const expect = require("expect");

const intercept = require("../lib/index");

const CANNOT_FIND = /cannot find module/i;
const UNEXPECTED_IDENTIFIER = /unexpected identifier/i;

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
        const msg = [
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
      const msg = [
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

describe("intercept-require", function () {

  // ensure we're back in a sane state after each test;
  afterEach(function () {
    assert(Module.prototype.require === __require, "Failed to call restore()")
  });

  describe("replacing Module.prototype.require()", function() {

    it("attaches and detaches as expected", function() {
      const oldRequire = Module.prototype.require;
      const restore = intercept(() => {});
      expect(Module.prototype.require).toNotEqual(oldRequire);
      restore()
      expect(Module.prototype.require).toEqual(oldRequire);
    });
  });

  function checkCalculator (calc) {
    return ["add", "subtract", "multiply", "divide"]
      .every(calc.hasOwnProperty.bind(calc));
  }

  describe("intercepting require()", function () {
    const intercept = require("../lib/index");

    it("invokes the listener when `require()` is invoked", function () {
      let called = false;
      const restore = intercept(() => {
        called = true
      });
      const calc = require("./calculator.js");
      expect(checkCalculator(calc)).toEqual(true);
      expect(called).toEqual(true);
      restore();
    });

    it("passes the result and some info to the listener", function () {
      let calc, result, info;
      function listener (r, i) {
        result = r;
        info = i;
      }

      const restore = intercept(listener);
      calc = require("./calculator");
      expect(calc).toEqual(result);
      expect(checkCalculator(calc)).toEqual(true);

      const callingFileRe = new RegExp(escapeRegExp("intercept-require/test/test.js") + "$");
      const absPathRe = new RegExp(escapeRegExp("intercept-require/test/calculator.js") + "$");

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
      const restore = intercept(function () { return true; });
      const calculator = require("./calculator.js");
      expect(calculator).toEqual(true);
      restore();
    });

    it("passes an as `info.error` if one occurs, and result and `null`", function () {
      let wasCalled1, wasCalled2, restore;

      function listener1 (result, info) {
        expect(result).toNotExist();
        expect(info.error).toBeA(Error);
        expect(UNEXPECTED_IDENTIFIER.test(info.error.message)).toEqual(true);
        wasCalled1 = true;
      }

      restore = intercept(listener1)
      require("./malformed.js");
      expect(wasCalled1).toBe(true);

      restore();

      function listener2 (result, info) {
        expect(result).toNotExist();
        expect(info.error).toBeA(Error);
        expect(CANNOT_FIND.test(info.error.message)).toBe(true);
        wasCalled2 = true;
      }
      restore = intercept(listener2);
      require("./no-exist.js");
      expect(wasCalled2).toBe(true);

      restore();
    });

    it("when no listener is attached, `require` should act normally", function () {
      expect(function () {
        require("./no-exist.js");
      }).toThrow(CANNOT_FIND);

      expect(function () {
        require("./malformed");
      }).toThrow(UNEXPECTED_IDENTIFIER);

      const calc = require("./calculator");
      expect(Object.keys(calc).sort()).toEqual(["add", "divide", "multiply", "subtract"]);
    });

    it("setListener throws when passed anything but a function", function () {
      expect(function () {
        intercept()
      }).toThrow(/argument must be a function/)
    });

    it("allows short circuiting", function () {
      const restore = intercept(function () {
        return result;
      }, {
        shortCircuit: true
      });
      const result = {works: true};
      const exported = require("./no-exist");
      expect(exported).toBe(result);
      restore();
    });

    it("allows short circuiting with matching", function () {
      const trueRequireResult = require("./calculator");

      const shortCircuitResult = {works: true};

      let timesShortCircuitedSucceeded = 0;
      let timesShortCircuitSkipped = 0;

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

      const didShortCircuit = require("./no-exist");
      const didntShortCircuit = require("./calculator");

      expect(didShortCircuit).toBe(shortCircuitResult);
      expect(trueRequireResult).toBe(didntShortCircuit);
      expect(timesShortCircuitSkipped).toBe(1);
      expect(timesShortCircuitedSucceeded).toBe(1);

      restore();
    });

  });
});
