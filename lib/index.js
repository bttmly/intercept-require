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

var callsite = require("callsite");
var assign = require("object-assign");
var intersection = require("lodash.intersection");

var moduleProto = Module.prototype;
var originalRequire = moduleProto.require;
var resolve = require.resolve;

var projectPath, requireListener, config;

var DEFAULT_CONFIG = {
  testOnlySubPath: ["test", "e2e"],
  alternateProjectPaths: []
};

var SEP = path.sep;

function hookedRequire (moduleId) {
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

function isNative (moduleId) {
  return process.binding("natives").hasOwnProperty(moduleId);
}

function isThirdParty (moduleId) {
  return !isNative(moduleId) && moduleId.indexOf(SEP) === -1;
}

function isAbsPath (requireString) {
  return requireString.indexOf(SEP) === 0;
}

function isTestOnly (callingFile) {
  return intersection(callingFile.split(SEP), config.testOnlySubPath).length !== 0;
}

function resolveAbsolutePath (callingFile, moduleId) {
  if (isAbsPath(moduleId)) {
    return moduleId;
  }

  var dir = path.dirname(callingFile);
  return path.join(dir, moduleId);
}

function isLocalToProject (file) {
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
      resolve(absPath);
    } catch (err) {
      absPathResolvedCorrectly = false;
    }
  }

  return {
    moduleId: moduleId,
    callingFile: callingFile,
    native: native,
    extname: path.extname(moduleId),
    thirdParty: thirdParty,
    absPath: absPath,
    absPathResolvedCorrectly: absPathResolvedCorrectly,
    // testOnly: isTestOnly(callingFile),
    localToProject: isLocalToProject(callingFile),
  };
}


var api = module.exports = {
  attach: function attach (pPath, cnfg) {
    moduleProto.require = hookedRequire;
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

