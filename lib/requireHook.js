/**
 * Created by Ralph Varjabedian on 11/6/14.
 *
 * Require hook is a utility class that overrides the require mechanism of node so that it can collect what is being "required"
 *
 * It will compile an array of data with the following properties:

 *  {
 *    require: This is the path sent to the require function
 *    callingFile: This is the file that the require was called from
 *    native: boolean indicating whether or not the required library is one of the built in native modules
 *    json: boolean indicating whether or not the required file was json or js
 *    absPath: the absolute path to the required file [this will only be defined if the required is not thirdParty]
 *    absPathResolvedCorrectly: if the absolute path required was resolved correctly and found [this will only be defined if the required is not thirdParty]
 *    testOnly: boolean indicating whether or not the required file was (most probably) for the usage or unit tests only
 *    thirdParty: boolean indicating whether the required file was for a library or a file
 *    localToProject: boolean indicating whether the require was called within the boundaries of the project involved
 *  }
 *
 *  Usage:
 *
 *  function attach: call to attach and start collecting "require" data.
 *  function detach: call to detach and stop collecting data.
 *
 *  function getData: get the array of data collected.
 *  function filterData: filter the array of data collected.
 *      There is also a few predefined functions with predefined filters
 *
 * require-hook is licensed under the [MIT]
 * do not remove this notice.
 */
'use strict';

var Module = require("module");
var path = require("path");
var fs = require("fs");
var assert = require("assert");
var helper = require("./helper.js");
var _ = require("lodash");
var config = require("../config.js");

var original_module_require = Module.prototype.require;

function getElementId() {
  return this.absPath ? this.absPath : this.require;
}

var lib = {
  old_reference: null,
  projectPath: null,
  event_require: null,
  data: [],
  reset: function() {
    this.data = [];
  },
  require: function(library) {
    var explicitSkip = arguments.length >= 2 && arguments[1] == "__skip";
    if(explicitSkip) {
      return console.require_hook.log("explicit skip on require", library);
    }
    var e = lib.process(library);
    var result = lib.old_reference.apply(this, arguments);
    if(lib.event_require) {
      result = lib.event_require(result, e);
    }
    return result;
  },
  process: function(library) {
    return this.addLibrary(library);
  },
  addLibrary: function(library) {
    var callingFile = this.getCallerFile();
    if(!callingFile) {
      return; // ignore
    }
    var thirdParty = this.isLibrary3rdParty(library);
    var absPath = undefined; // undefined if third party library
    var absPathResolvedCorrectly = undefined;
    if(!thirdParty) { // not third party, let's fetch absolute path
      var res = this.resolveLibraryAbsPath(callingFile, library);
      absPath = res.absPath;
      absPathResolvedCorrectly = res.absPathResolvedCorrectly;
      if(absPathResolvedCorrectly) {
        assert(fs.existsSync(absPath), "asserting that the abs path resolving code is working as expected");
      }
      if(_.find(this.data, {absPath: absPath})) { // already added
        return null;
      }
    }
    var e = {
      require: library,
      callingFile: callingFile,
      native: !!process.binding('natives')[library],
      json: (path.extname(library) === ".json"),
      absPath: absPath,
      absPathResolvedCorrectly: absPathResolvedCorrectly,
      testOnly: this.isTestOnly(callingFile),
      thirdParty: thirdParty,
      localToProject: this.isBelongsToProject(callingFile),
      getId: getElementId
    };
    this.data.push(e);
    return e;
  },
  isTestOnly: function(callingFile) {
    return _.intersection(callingFile.split(path.sep), config.testOnlySubPath).length !== 0;
  },
  isLibrary3rdParty: function(library) {
    return library.indexOf(path.sep) === -1;
  },
  isAbsPath: function(library) {
    return library.indexOf(path.sep) === 0;
  },
  resolveLibraryAbsPath: function(callingFile, library) {
    var res = {absPath: null, absPathResolvedCorrectly: false};
    if(this.isAbsPath(library)) {
      res.absPath = library;
      try {
        res.absPath = require.resolve(res.absPath);
        res.absPathResolvedCorrectly = true;
      } catch(e) {
      }
    } else {
      res.absPath = path.normalize(path.join(path.dirname(callingFile), library));
      try {
        res.absPath = require.resolve(res.absPath);
        res.absPathResolvedCorrectly = true;
      } catch(e) {
      }
    }
    return res;
  },
  isBelongsToProject: function(file) {
    var belongs = path.relative(this.projectPath, file).indexOf("..") === -1;
    if(belongs) {
      return belongs;
    }
    if(config.alternateProjectPaths.length) {
      for(var i = 0; i < config.alternateProjectPaths.length; i++) {
        if(config.alternateProjectPaths[i].indexOf(path.sep) === 0) {
          belongs = path.relative(config.alternateProjectPaths[i], file).indexOf("..") === -1;
          if(belongs) {
            return belongs;
          }
        } else {
          belongs = file.indexOf(config.alternateProjectPaths[i]) !== -1;
          if(belongs) {
            return belongs;
          }
        }
      }
    }
    return false;
  },
  getCallerFile: function() {
    var _prepareStackTrace = Error.prepareStackTrace;
    try {
      Error.prepareStackTrace = function(err, stack) { return stack; };
      var err = new Error();
      var currentFile = err.stack.shift().getFileName();
      while(err.stack.length) {
        var callerFile = err.stack.shift().getFileName();
        if(callerFile != currentFile && this.safeCallerList.indexOf(callerFile) === -1) {
          return callerFile;
        }
      }
    } catch(err) {
    } finally {
      Error.prepareStackTrace = _prepareStackTrace;
    }
    return "<invalid filename>";
  },
  safeCallerList: ["module.js"]
};

module.exports = {
  config: config,
  setConfigSource: function(cnfg) {
    config = this.config = cnfg;
  },
  attach: function(projectPath) {
    if(lib.old_reference) {
      throw new Error("already attached");
    }
    lib.reset();
    lib.projectPath = projectPath;
    lib.old_reference = Module.prototype.require;
    assert(lib.old_reference);
    Module.prototype.require = lib.require;
    helper.copyProperties(lib.old_reference, lib.require);
  },
  detach: function() {
    if(!lib.old_reference) {
      throw new Error("not attached");
    }
    Module.prototype.require = lib.old_reference;
    lib.old_reference = null;
  },
  setEvent: function(event) {
    lib.event_require = event;
  },
  getData: function() {
    return lib.data;
  },
  getData_localToProject: function() {
    return this.filterData({localToProject: true});
  },
  getData_thirdParty: function() {
    return this.filterData({native: false, thirdParty: true});
  },
  getData_localThirdParty: function() {
    return this.filterData({native: false, localToProject: true, thirdParty: true});
  },
  filterData: function(filter) {
    return _.filter(lib.data, filter);
  },
  getOriginalRequire: function() {
    return original_module_require;
  }
};