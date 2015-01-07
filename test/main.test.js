/**
 * Created by Ralph Varjabedian on 11/14/14.
 */

'use strict';

require('chai').should();

describe('testing require-hook', function() {

  it('testing require and hook', function() {
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

