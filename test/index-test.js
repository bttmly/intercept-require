"use strict";

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

describe("replacing Module.prototype.require()", function() {

  it("attaches and detaches as expected", function() {
    var Module = require("module");
    var oldRequire = Module.prototype.require;

    var intercept = require("../lib/index");
    Module.prototype.require.should.equal(oldRequire);
    intercept.attach();
    Module.prototype.require.should.not.equal(oldRequire);
    intercept.detach();
    Module.prototype.require.should.equal(oldRequire);
  });

  it("doesn't fail if intercepting is active but no listener", function () {
    var intercept = require("../lib/index");
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

describe("intercepting require()", function () {
  var intercept = require("../lib/index");

  beforeEach(butt(intercept.attach, 0));
  afterEach(butt(intercept.detach, 0));

  it("invokes the listener when `require()` is invoked", function () {
    var called = false;
    function listener () {
      called = true;
    }
    intercept.setListener(listener);
    var calc = require("./calculator.js");
    (checkCalculator(calc)).should.equal(true);
    called.should.equal(true);
  });

  it("passes the result and some info to the listener", function () {
    var calc, result, info;
    function listener (r, i) {
      result = r;
      info = i;
    }
    intercept.setListener(listener);
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
      testOnly: false,
      local: true,
    });
  });

  it("allows the listener to pass back a value", function () {
    function listener () {
      return true;
    }
    intercept.setListener(listener);
    var calculator = require("./calculator.js");
    calculator.should.equal(true);
  });

  it("passes an as `info.error` if one occurs, and result and `null`", function () {
    var wasCalled1, wasCalled2;

    function listener1 (result, info) {
      should.not.exist(result);
      info.error.should.be.instanceof(Error);
      UNEXPECTED_IDENTIFIER.test(info.error.message).should.equal(true);
      wasCalled1 = true;
    }
    intercept.setListener(listener1);
    require("./malformed.js");
    wasCalled1.should.equal(true);

    intercept.resetListener();

    function listener2 (result, info) {
      should.not.exist(result);
      info.error.should.be.instanceof(Error);
      CANNOT_FIND.test(info.error.message).should.equal(true);
      wasCalled2 = true;
    }
    intercept.setListener(listener2);
    require("./no-exist.js");
    wasCalled2.should.equal(true);

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
    intercept.setListener.bind(intercept).should.throw(/`listener` must be a function/);
  });

  it("allows short circuiting", function () {
    intercept.detach();
    intercept.attach({
      shortCircuit: true
    });
    var result = {works: true};
    intercept.setListener(function () {
      return result;
    });
    var exported = require("./no-exist");
    exported.should.equal(result);
  });

  it("allows short circuiting with matching", function () {
    intercept.detach();

    var trueRequireResult = require("./calculator");
    
    var shortCircuitResult = {works: true};

    intercept.attach({
      shortCircuit: true,
      shortCircuitMatch: function (info) {
        return (/exist/).test(info.absPath);
      }
    });

    intercept.setListener(function (original, info) {
      if (info.didShortCircuit) {
        return shortCircuitResult;
      }
      return trueRequireResult;
    });

    var didShortCircuit = require("./no-exist");
    var didntShortCircuit = require("./calculator");

    didShortCircuit.should.equal(shortCircuitResult);
    trueRequireResult.should.equal(didntShortCircuit);
  });

});
