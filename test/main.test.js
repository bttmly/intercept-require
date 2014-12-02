/**
 * Created by Ralph Varjabedian on 11/14/14.
 */

'use strict';

var should = require('should');

describe('testing require-hook', function() {
  this.timeout(0);

  it('testing require and hook', function(done) {
    var requireHook = require("../");
    try {
      requireHook.detach();
    } catch(err) {
      should.exist(err);
    }
    var Module = require("module");
    var oldRequire = Module.prototype.require;
    should.not.exist(global.moduleRequire);
    Module.prototype.require.should.not.equal(oldRequire);
    requireHook.config.testOnlySubPath = []; // remove it, we need the hook to attach to all files in test mode
    requireHook.config.alternateProjectPaths = ["/anything"];
    try {
      requireHook.attach();
    } catch(err) {
      should.exist(err);
    }
    requireHook.detach();
    requireHook.attach();
    requireHook.getData();
    requireHook.getData_localToProject();
    requireHook.getData_thirdParty();
    requireHook.getData_localThirdParty();
    requireHook.getOriginalRequire();
    requireHook.getProfilerRequire();
    done();
  });

});

