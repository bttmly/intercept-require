/**
 * Created by Ralph Varjabedian on 11/14/14.
 */

'use strict';

var should = require('chai').should();

var butt = require('butt');

function noop () {}

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
    require("./calculator");
    called.should.equal(true);
  });

  it('passes the result and some info to the listener', function () {
    var calculator, result, info;
    function listener (r, i) {
      result = r;
      info = i;
    }
    requireHook.setListener(listener);
    calculator = require("./calculator");
    calculator.should.equal(result);
  });

  it('allows the listener to pass back a value', function () {
    function listener () {
      return true;
    }
    requireHook.setListener(listener);
    var calculator = require("./calculator");
    calculator.should.equal(true);
  });

  it('passes an error in the result spot if one occurs', function () {
    function listener1 (err, info) {
      (err instanceof Error).should.equal(true);
      should.exist(info);
      /unexpected identifier/i.test(err.message).should.equal(true);
      return true;
    }

    function listener2 (err, info) {
      (err instanceof Error).should.equal(true);
      should.exist(info);
      /cannot find module/i.test(err.message).should.equal(true);
      return true;
    }

    requireHook.setListener(listener1);
    require("./malformed.js");
    requireHook.resetListener();

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
