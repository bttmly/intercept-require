"use strict";

const path = require("path");
const assert = require("assert");
const Module = require("module");
const __require = Module.prototype.require;
const expect = require("expect");

const intercept = require("../lib/index");

const CANNOT_FIND = /cannot find module/i;
const UNEXPECTED_IDENTIFIER = /unexpected identifier/i;

describe("intercept-require", function () {

  let restore;

  // ensure we're back in a sane state after each test;
  afterEach(function () {
    if (restore) restore();
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

  describe("intercepting require()", function () {
    const intercept = require("../lib/index");

    it("invokes the listener when `require()` is invoked", function () {
      let called = false;
      restore = intercept(() => { called = true });
      const calc = require("./calculator.js");
      expect(checkCalculator(calc)).toEqual(true);
      expect(called).toEqual(true);
    });

    it("passes the result and some info to the listener", function () {

      let result, info;
      function listener (r, i) {
        result = r;
        info = i;
      }

      restore = intercept(listener);
      const calc = require("./calculator");
      expect(calc).toEqual(result);
      expect(checkCalculator(calc)).toEqual(true);

      const absPath = path.join(__dirname, "../test/calculator.js");
      const callingFile = path.join(__dirname, "../test/test.js");

      expect(info.callingFile).toBe(callingFile);
      expect(info.moduleId).toBe("./calculator");
      expect(info.extname).toBe(".js");
      expect(info.native).toBe(false);
      expect(info.thirdParty).toBe(false);
      expect(info.absPath).toBe(absPath);
      expect(info.absPathResolvedCorrectly).toBe(true);
      expect(info.local).toBe(true);
    });

    it("allows the listener to pass back a value", function () {
      restore = intercept(function () { return true; });
      const calculator = require("./calculator.js");
      expect(calculator).toEqual(true);
    });

    it("passes an as `info.error` if one occurs, and result and `null`", function () {
      let wasCalled1, wasCalled2;

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
    });

    it("when no listener is attached, `require` should act normally", function () {
      expect(() => require("./no-exist.js")).toThrow(CANNOT_FIND);
      expect(() => require("./malformed")).toThrow(UNEXPECTED_IDENTIFIER);
      const calc = require("./calculator");
      expect(Object.keys(calc).sort()).toEqual(["add", "divide", "multiply", "subtract"]);
    });

    it("setListener throws when passed anything but a function", function () {
      expect(intercept).toThrow(/argument must be a function/)
    });

    it("allows short circuiting", function () {
      restore = intercept(() => result, {shortCircuit: true});
      const result = {works: true};
      const exported = require("./no-exist");
      expect(exported).toBe(result);
    });

    it("allows short circuiting with matching", function () {
      const trueRequireResult = require("./calculator");

      const shortCircuitResult = {works: true};

      let timesShortCircuitedSucceeded = 0;
      let timesShortCircuitSkipped = 0;

      restore = intercept(function (original, info) {
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
      expect(didntShortCircuit).toBe(trueRequireResult);
      expect(timesShortCircuitSkipped).toBe(1);
      expect(timesShortCircuitedSucceeded).toBe(1);
    });

    it("should not throw on native modules", function () {
      restore = intercept(() => {});
      expect(() => require("fs")).toNotThrow();
    });

  });
});

function checkCalculator (calc) {
  return ["add", "subtract", "multiply", "divide"]
    .every(calc.hasOwnProperty.bind(calc));
}
