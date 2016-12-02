# intercept-require [![Build Status](https://travis-ci.org/nickb1080/intercept-require.svg?branch=master)](https://travis-ci.org/nickb1080/intercept-require)

## Installation

`npm install intercept-require`

## About
Intercept, prevent, modify, and short-circuit calls to `require()`. 

## Example
```js
const intercept = require("intercept-require");
// in this example, just transparently log every require
const restore = intercept(function (moduleExport, info) {
  // moduleExport is whatever the actual module exported

  // info looks like:
  //  {
  //    moduleId: "lodash",
  //    callingFile: "index.js",
  //    native: false,
  //    extname: ".js",
  //    thirdParty: true,
  //    exports: [[actual lodash object]]
  //    absPath: /from/root/to/project/node_modules/lodash/lodash.js,
  //    absPathResolvedCorrectly: true,
  //    testOnly: false,
  //    local: false
  //  }
  console.log("require:", info.moduleId, "from", info.callingFile);
  
  // value returned from this function will be passed back to the caller as if it was module.exports
  return moduleExport;
}, config);
// config has only one option `shortCircuit: boolean`
// if short-circuit is active, `moduleExport` argument to listener will be null

// require() calls now being intercepted
restore();
// require() calls no longer intercepted
```
