// FORKED FROM https://bitbucket.org/ralphv/require-hook/

"use strict";

var Module = require("module");
var path = require("path");

var callsite = require("callsite");
var assign = require("object-assign");

var moduleProto = Module.prototype;
var originalRequire = moduleProto.require;

var DEFAULT_CONFIG = {
  testOnlySubPath: [],
  alternateProjectPaths: []
};

var SEP = path.sep;

var projectPath, requireListener, config;

function interceptedRequire (moduleId) {
  var listenerResult, result;
  var info = generateRequireInfo(moduleId);

  try {
    /*jshint validthis:true */
    result = originalRequire.apply(this, arguments);
    /*jshint validthis:false */
  } catch (err) {
    result = err;
  }

  if (requireListener) {
    listenerResult = requireListener(result, info);
    result = (listenerResult == null ? result : listenerResult);
  }

  if (result instanceof Error) {
    throw result;
  }

  return result;
}

var localModuleRe = /^[\/\.]/;

function isNative (moduleId) {
  return process.binding("natives").hasOwnProperty(moduleId);
}

function isThirdParty (moduleId) {
  return !isNative(moduleId) && !localModuleRe.test(moduleId);
}

// WARN: Ensure we don't pass a module identifier to this
// since "/view/thing" is a valid local module identifier
function isAbsPath (requireString) {
  return requireString[0] === SEP;
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
  return path.join(dir, moduleId);
}

function isLocal (file) {
  return path.relative(projectPath, file).indexOf("..") === -1;
}

function getCallingFile () {
  var stack = callsite();
  var currentFile = stack.shift().getFileName();
  while (stack.length) {
    var callingFile = stack.shift().getFileName();
    if (callingFile !== currentFile && safeCallerList.indexOf(callingFile) === -1) {
      return callingFile;
    }
  }
  return "<invalid filename>";
}

var safeCallerList = ["module.js"];

function generateRequireInfo (moduleId) {

  var callingFile = getCallingFile();
  var native = isNative(moduleId);
  var thirdParty = isThirdParty(moduleId);

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
    local: isLocal(moduleId),
  };
}

var api = module.exports = {
  attach: function attach (pPath, cnfg) {
    moduleProto.require = interceptedRequire;
    projectPath = pPath || process.cwd();
    cnfg = cnfg || {};
    config = assign({}, cnfg, DEFAULT_CONFIG);
  },

  detach: function detach () {
    moduleProto.require = originalRequire;
    api.resetListener();
    projectPath = null;
    config = null;
  },

  setListener: function setListener (listener) {
    if (typeof listener !== "function") {
      throw new TypeError("`listener` must be a function.");
    }
    requireListener = listener;
  },

  resetListener: function resetListener () {
    requireListener = null;
  },

  originalRequire: originalRequire
};
