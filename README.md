#### forked from [https://bitbucket.org/ralphv/require-hook](https://bitbucket.org/ralphv/require-hook)
---------------------------------------------------------------------------------------------------

# intercept-require [![Build Status](https://travis-ci.org/nickb1080/intercept-require.svg?branch=master)](https://travis-ci.org/nickb1080/intercept-require)

```js
var intercept = require("intercept-require");
intercept.attach();
// calls to require() are now being intercepted

// no listener is set right now. This works as expected.
require("path");

var lastRequireInfo;

intercept.setListener(function (moduleExport, info) {
  // moduleExports is whatever was found by the built-in require
  lastRequireInfo = info;
  return moduleExport;
});

require("lodash");

// lastRequireInfo looks like:
//  {
//    moduleId: "lodash",
//    callingFile: "index.js",
//    native: false,
//    extname: path.extname(absPath),
//    thirdParty: true,
//    absPath: /from/root/to/project/node_modules/lodash/lodash.js,
//    absPathResolvedCorrectly: true,
//    testOnly: false,
//    local: false
//  }
```

### License
MIT
