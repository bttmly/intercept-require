// FORKED FROM https://bitbucket.org/ralphv/require-hook/

"use strict";

var Module = require("module");
var path = require("path");
var assert = require("assert");

var callsite = require("callsite");
var assign = require("object-assign");

function createInterceptor (__require, interceptor, config) {

  return function interceptedRequire (moduleId) {
    var interceptorResult;
    var __exports = null;
    var info = generateRequireInfo(moduleId);

    // config.shortCircuit can avoid disk I/O entirely
    if (config.shortCircuit && interceptor) {
      info.attemptedShortCircuit = true;

      // either no matcher function, or matcher succeeds
      if (!config.shortCircuitMatch || config.shortCircuitMatch(info)) {
        info.didShortCircuit = true;
        return interceptor(null, info);
      }
    }

    try {
      /*jshint validthis:true */
      __exports = __require.apply(this, arguments);
      /*jshint validthis:false */
    } catch (err) {
      info.error = err;
    }

    // if there's an interceptor, call it
    if (interceptor) {
      interceptorResult = interceptor(__exports, info);
      return interceptorResult == null ? __exports : interceptorResult;
    }

    // otherwise behave normally; throw an error if it occurred
    // else just return the result of `require()`
    if (info.error) throw info.error;
    return __exports;
  }

}


var localModuleRe = /^[\/\.]/;
function isLocal (moduleId) {
  return localModuleRe.test(moduleId);
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
  return requireString[0] === path.sep;
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

function getCallingFile () {
  var stack = callsite();
  var currentFile = stack.shift().getFileName();
  var safeCallerList = new Set(["internal/module.js", "module.js"]);

  while (stack.length) {
    var callingFile = stack.shift().getFileName();
    if (callingFile !== currentFile && !safeCallerList.has(callingFile)) {
      return callingFile;
    }
  }

  return "[Unknown calling file]";
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
    extname: absPath ? path.extname(absPath) : null,
    thirdParty: thirdParty,
    absPath: absPath,
    absPathResolvedCorrectly: absPathResolvedCorrectly,
    local: local,
    error: null,
  };
}

function intercept (fn, settings) {
  assert(typeof fn === "function", "argument must be a function.");

  var config = assign({}, settings || {});
  var original = Module.prototype.require;

  Module.prototype.require = createInterceptor(original, fn, config);

  return function restore () {
    Module.prototype.require = original;
  };
}

module.exports = intercept;
