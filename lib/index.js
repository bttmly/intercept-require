// FORKED FROM https://bitbucket.org/ralphv/require-hook/

"use strict";

var Module = require("module");
var path = require("path");
var assert = require("assert");

var callsite = require("callsite");
var assign = require("object-assign");

var moduleProto = Module.prototype;
var originalRequire = moduleProto.require;

function defaultConfig () {
  return {
    testOnlySubPath: [],
    alternateProjectPaths: []
  };
}

var SEP = path.sep;

var requireListener, config;

function interceptedRequire (moduleId) {
  var listenerResult;
  var result = null;
  var error = null;
  var info = generateRequireInfo(moduleId);

  // config.shortCircuit can avoid disk I/O entirely
  if (config.shortCircuit && requireListener) {
    info.attemptedShortCircuit = true;

    // either no matcher function, or matcher succeeds
    if (!config.shortCircuitMatch || config.shortCircuitMatch(info)) {
      info.didShortCircuit = true;
      return requireListener(null, info);
    }
  }

  try {
    /*jshint validthis:true */
    result = originalRequire.apply(this, arguments);
    /*jshint validthis:false */
  } catch (err) {
    result = null;
    error = err;
  }

  info.error = error;

  // if there's a listener, do listener things
  if (requireListener) {
    listenerResult = requireListener(result, info);
    return (listenerResult == null ? result : listenerResult);
  }

  // otherwise behave normally; throw an error if it occurred
  // else just return the result of `require()`
  if (error) throw error;
  return result;
}

var localModuleRe = /^[\/\.]/;
function isLocal (moduleId) {
  return localModuleRe.test(moduleId)
}

function isNative (moduleId) {
  return process.binding("natives").hasOwnProperty(moduleId);
}

function isThirdParty (moduleId) {
  return !isLocal(moduleId) && !isNative(moduleId);
}

// WARN: Ensure we don't pass a module identifier to this
// since "/view/thing" is a valid local module identifier
function isAbsPath (requireString) {
  return requireString[0] === SEP;
}

function isNative (moduleId) {
  return process.binding("natives").hasOwnProperty(moduleId);
}

var localModuleRe = /^[\/\.]/;
function isLocal (moduleId) {
  return localModuleRe.test(moduleId);
}

function isThirdParty (moduleId) {
  return !isNative(moduleId) && !isLocal(moduleId);
}

function isTestOnly (callingFile) {
  return config.testOnlySubPath.some(function (pathPiece) {
    return callingFile.indexOf(pathPiece) !== -1;
  });
}

function resolveAbsolutePath (callingFile, moduleId) {
  if (isAbsPath(moduleId)) {
    return moduleId;
  }
  var dir = path.dirname(callingFile);
  if (typeof dir === "string" && typeof moduleId === "string") {
    return path.join(dir, moduleId);
  }
  return null;
}

var safeCallerList = {"module.js": null};
function getCallingFile () {
  var stack = callsite();
  var currentFile = stack.shift().getFileName();
  while (stack.length) {
    var callingFile = stack.shift().getFileName();
    if (callingFile !== currentFile && !safeCallerList.hasOwnProperty(callingFile)) {
      return callingFile;
    }
  }
  return "[Unknown calling file.]";
}

function generateRequireInfo (moduleId) {

  var callingFile = getCallingFile();
  var native = isNative(moduleId);
  var thirdParty = isThirdParty(moduleId);
  var local = isLocal(moduleId);

  var absPath, absPathResolvedCorrectly;

  if (!thirdParty && !native) {
    absPath = resolveAbsolutePath(callingFile, moduleId);
    absPathResolvedCorrectly = true;
    try {
      absPath = require.resolve(absPath);
    } catch (err) {
      absPathResolvedCorrectly = false;
    }
  }

  return {
    moduleId: moduleId,
    callingFile: callingFile,
    native: native,
    extname: path.extname(absPath),
    thirdParty: thirdParty,
    absPath: absPath,
    absPathResolvedCorrectly: absPathResolvedCorrectly,
    testOnly: isTestOnly(callingFile),
    local: local,
  };
}

var api = module.exports = {
  attach: function attach (settings) {
    settings = settings || {};
    assert.equal((typeof settings), "object", "argument `settings` must be an object or null");
    config = assign(defaultConfig(), settings);
    moduleProto.require = interceptedRequire;
  },

  detach: function detach () {
    moduleProto.require = originalRequire;
    config = null;
    api.resetListener();
  },

  setListener: function setListener (listener) {
    assert.equal((typeof listener), "function", "argument `listener` must be a function.")
    requireListener = listener;
  },

  resetListener: function resetListener () {
    requireListener = null;
  },

  originalRequire: originalRequire
};
