## require-hook - A node.js library that allows you to hook 'require', gather data about calls to 'require' and intercept/modify the results

[![NPM](https://nodei.co/npm/require-hook.png?mini=true)](https://nodei.co/npm/require-hook/)

* [Features](#features)
* [Getting started](#getting-started)
* [What is collected?](#what-is-collected)
* [API](#api)
* [License](#license)
* [Changelog](#changelog)
* [Third-party libraries](#third-party-libraries)

### Features

* Hook 'require' of node.js.
* Can gather data of 'require' calls.
* Can call an event handler on each 'require' call to possibly intercept and change the data.

### Getting started

    $ npm install require-hook

In your project:

    var require-hook = require("require-hook");

    require-hook.attach();
    ...
    require-hook.getData();

### What is collected

require-hook will gather an array of data, each element will have the following properties

    {
      require: This is the path sent to the require function
      callingFile: This is the file that the require was called from
      native: boolean indicating whether or not the required library is one of the built in native modules
      json: boolean indicating whether or not the required file was json or js
      absPath: the absolute path to the required file [this will only be defined if the required is not thirdParty]
      absPathResolvedCorrectly: if the absolute path required was resolved correctly and found [this will only be defined if the required is not thirdParty]
      testOnly: boolean indicating whether or not the required file was (most probably) for the usage or unit tests only
      thirdParty: boolean indicating whether the required file was for a library or a file
      localToProject: boolean indicating whether the require was called within the boundaries of the project involved
    }

### API

### License

require-hook is licensed under the [BSD-3 License](http://bitbucket.com/ralphv/require-hook/raw/master/LICENSE).

### Changelog

* 0.1.0: Initial version

### Third-party libraries

The following third-party libraries are used:

* lodash: https://lodash.com/
