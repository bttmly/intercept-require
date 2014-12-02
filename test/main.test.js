/**
 * Created by Ralph Varjabedian on 11/14/14.
 */

'use strict';

var should = require('should');
var path = require('path');

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
    Module.prototype.require.should.equal(oldRequire);
    requireHook.config.testOnlySubPath = []; // remove it, we need the hook to attach to all files in test mode
    requireHook.config.alternateProjectPaths = ["/anything"];
    try {
      requireHook.attach();
    } catch(err) {
      should.exist(err);
    }
    Module.prototype.require.should.not.equal(oldRequire);
    requireHook.detach();
    requireHook.attach();
    requireHook.getData_localToProject();
    requireHook.getData_thirdParty();
    requireHook.getData_localThirdParty();
    requireHook.getOriginalRequire();
    done();
  });

  it('testing setEvent', function(done) {
    var requireHook = require("../");
    requireHook.setEvent(function(requireResult, requireCallData){
    });
    require("./mathHelper.js");
    var data = requireHook.getData();
    should.equal(data.length, 2);
    should.equal(data[0].getId(), path.join(process.cwd(), "index.js"));
    should.equal(data[1].getId(), path.join(process.cwd(), "test", "mathHelper.js"));
    require("./mathHelper.js", "__skip");
    require("path");
    done();
  });

});

