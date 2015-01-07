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

"use strict";

var Module = require("module");
var path = require("path");
var fs = require("fs");
var assert = require("assert");

var assign = require("object-assign");
var intersection = require("lodash.intersection");

var moduleProto = Module.prototype;
var originalRequire = moduleProto.require;

var projectPath, requireListener, config;

var DEFAULT_CONFIG = {
  testOnlySubPath: ["test", "e2e"],
  alternateProjectPaths: []
};

function hookedRequire (moduleId) {
  // var explicitSkip = arguments.length >= 2 && arguments[1] == "__skip";
  // if (explicitSkip) {
  //   return console.require_hook.log("explicit skip on require", library);
  // }

  var listenerResult, result;

  var info = generateRequireInfo(moduleId);

  try {
    // this function will be called as `Module.prototype.require`, 
    // so we need to preserve the `this` binding that it gets
    /*jshint validthis:true */
    result = originalRequire.apply(this, arguments);
  } catch (err) {
    result = err;
  }

  // execute listener with result/err and info
  // if listener returns something, set result to that, otherwise leave it as is
  if (requireListener) {
    listenerResult = requireListener(result, info);
    result = (listenerResult == null ? result : listenerResult);
  }

  // if result is an Error at this point let's just throw it here
  // more informative than providing it to the module requesting it
  if (result instanceof Error) {
    throw result;
  }

  return result;
}

function generateRequireInfo (moduleId) {
  var callingFile = getCallerFile();

  // ignore
  if (!callingFile) {
    return;
  }

  var thirdParty = isLibrary3rdParty(moduleId);
  var absPath;
  var absPathResolvedCorrectly;

  // not third party, let's fetch absolute path
  if (!thirdParty) {
    var res = resolveLibraryAbsPath(callingFile, moduleId);
    absPath = res.absPath;
    absPathResolvedCorrectly = res.absPathResolvedCorrectly;
    
    if (absPathResolvedCorrectly) {
      assert(fs.existsSync(absPath), "asserting that the abs path resolving code is working as expected");
    }
  }

  var evt = {
    require: moduleId,
    callingFile: callingFile,
    native: !!process.binding('natives')[moduleId],
    json: (path.extname(moduleId) === ".json"),
    absPath: absPath,
    absPathResolvedCorrectly: absPathResolvedCorrectly,
    testOnly: isTestOnly(callingFile),
    thirdParty: thirdParty,
    localToProject: isLocalToProject(callingFile),
  };

  return evt;
}


function isTestOnly (callingFile) {
  return intersection(callingFile.split(path.sep), config.testOnlySubPath).length !== 0;
}

function isLibrary3rdParty (requireString) {
  return requireString.indexOf(path.sep) === -1;
}

function isAbsPath (requireString) {
  return requireString.indexOf(path.sep) === 0;
}

function resolveLibraryAbsPath (callingFile, library) {
  var res = {absPath: null, absPathResolvedCorrectly: false};
  if (isAbsPath(library)) {
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
}

function isLocalToProject (file) {
  var belongs = path.relative(projectPath, file).indexOf("..") === -1;
  if (belongs) {
    return belongs;
  }

  if (config.alternateProjectPaths.length) {
    for(var i = 0; i < config.alternateProjectPaths.length; i++) {
      if (config.alternateProjectPaths[i].indexOf(path.sep) === 0) {
        belongs = path.relative(config.alternateProjectPaths[i], file).indexOf("..") === -1;
        if (belongs) {
          return belongs;
        }
      } else {
        belongs = file.indexOf(config.alternateProjectPaths[i]) !== -1;
        if (belongs) {
          return belongs;
        }
      }
    }
  }

  return false;
}

function getCallerFile () {
  var _prepareStackTrace = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = function(err, stack) { return stack; };
    var err = new Error();
    var currentFile = err.stack.shift().getFileName();
    while (err.stack.length) {
      var callerFile = err.stack.shift().getFileName();
      if (callerFile !== currentFile && safeCallerList.indexOf(callerFile) === -1) {
        return callerFile;
      }
    }
  } catch(e) {
    // no problem
  } finally {
    Error.prepareStackTrace = _prepareStackTrace;
  }
  return "<invalid filename>";
}

var safeCallerList = ["module.js"];

module.exports = {
  attach: function attach (pPath, cnfg) {
    moduleProto.require = hookedRequire;
    projectPath = pPath || process.cwd();
    cnfg = cnfg || {};
    config = assign(cnfg, DEFAULT_CONFIG);
  },
  detach: function detach () {
    moduleProto.require = originalRequire;
    projectPath = null;
    config = null;
  },
  setListener: function setListener (listener) {
    assert(typeof listener === "function", "`listener` must be a function.");
    requireListener = listener;
  },
  resetListener: function resetListener () {
    requireListener = null;
  },
  originalRequire: originalRequire
};