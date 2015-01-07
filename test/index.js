/**
 * Created by Ralph Varjabedian on 11/14/14.
 */

'use strict';

require('chai').should();

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

  beforeEach(function () {
    requireHook.attach();
  });
  // afterEach(requireHook.detach);

  it('invokes the listener when `require()` is invoked', function () {
    var result, info;

    function listener (r, i) {
      result = r;
      info = i;
    }

    requireHook.setListener(listener);

    var calculator = require("./calculator");

    calculator.should.equal(result);

  });


});
