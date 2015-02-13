#### forked from [https://bitbucket.org/ralphv/require-hook](https://bitbucket.org/ralphv/require-hook)
---------------------------------------------------------------------------------------------------

# intercept-require [![Build Status](https://travis-ci.org/nickb1080/intercept-require.svg?branch=master)](https://travis-ci.org/nickb1080/intercept-require) [![codecov.io](https://codecov.io/github/nickb1080/intercept-require/coverage.svg?branch=master)](https://codecov.io/github/nickb1080/intercept-require?branch=master)

## Installation

`npm install intercept-require`

## About
Intercept, prevent, modify, and short-circuit calls to `require()`. 


## API

#### `.attach([Object settings])`
Replace `Module.prototype.require` with an intercepting function. Calls to `require()` continue to behave normally until a listener is set. `settings` is optional, and accepts two options `Boolean shortCircuit` and `Function shortCircuitMatch<Object info>`. 

Short-circuiting allows a consumer to skip disk I/O entirely. In normal situatons, `intercept-require` makes a real `require()` call and intercepts it _on the way back_. Short-circuiting skips this step. This is probably useful only in obscure cases. Further, in the few cases where short-circuiting is necessary, it's unlikely that all `require()` calls need to be short-circuited. `shortCircuitMatch` is a function which is passed the `info` object and returns whether or not the call should be short-circuited. 

#### `.detach()`
Restore `Module.prototype.require` to it's original value. This also resets the `listener`, so that if `.attach()` is later called, no listener will initially be set.

#### `.setListener(Function<Object info, Object result> listener)`
Set the listener that will be invoked on every `require()` call. The listener is passed two arguments: an `info` object that represents some metadata about the `require()` call and the module that was found, and an `result` object which contains the `module.exports` of whatever module would have been found had `require()` been called normally, **unless** the `require()` call throws, in which case `result` will be `undefined` and `info.error` will contain the caught error.

When short-circuiting is active, `result` will be null.

The return value of `setListener()` is passed to the requiring module as the return value of `require()` **unless an error is returned, in which case it will be thrown**. If you want to handle (and possibly recover from) errors, then 

#### `.resetListener()`
Discard the current `listener`. Until another listener is set, all `require()` calls will behave as normal.

#### `.originalRequire`
A reference to the original function found at `Module.prototype.require`. It's technically possible that this isn't the built in function if something else has overwritten it before `intercept-require` is run.


## Example
```js
var intercept = require("intercept-require");
intercept.attach();
// Module.prototype.require is now overwritten with the interceptor...

// However, no listener is set right now, so this works as normal.
require("path");

var lastRequireInfo;
intercept.setListener(function (moduleExport, info) {
  // moduleExport is whatever was found by the built-in require
  lastRequireInfo = info;
  return moduleExport;
});

require("lodash");

// lastRequireInfo looks like:
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
```

### Info
`info` objects adhere to this schema
```
{
  exports: Any,
  moduleId: String,
  callingFile: String,
  extname: String,
  absPath: String,
  core: Boolean, 
  thirdParty: Boolean,
  local: Boolean,
  absPathResolvedCorrectly: Boolean,
  testOnly: Boolean
}
```

### License
MIT
