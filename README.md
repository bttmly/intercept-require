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

    var path = require("path");
    var require-hook = require("require-hook");

    require-hook.attach(path.resolve());
    ...
    var result = require-hook.getData();

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

* [`config`](#config)
* [`attach`](#attach)
* [`detach`](#detach)
* [`setEvent`](#setEvent)
* [`getData`](#getData)
* [`getData_localToProject`](#getData_localToProject)
* [`getData_thirdParty`](#getData_thirdParty)
* [`getData_localThirdParty`](#getData_localThirdParty)
* [`filterData`](#filterData)

---------------------------------------

<a name="config" />
### config (object)

This is the configuration object, the same object that gets loaded from config.js file.

__Properties__

* `testOnlySubPath` - An array of substrings that identify code loaded from test related sub folders.
* `alternateProjectPaths` - Pass alternate projects path to identify as "localToProject"

---------------------------------------

<a name="attach" />
### attach(projectPath)

Hook the require functionality.

__Arguments__

* `projectPath` - Target project's path

__Example__

    var path = require("path");
    require-hook.attach(path.resolve());

---------------------------------------

<a name="detach" />
### detach()

Remove the hook.

---------------------------------------

<a name="setEvent" />
### setEvent(event_handler)

Set an optional event handler which will be called on each "require" call.

__Arguments__

* `event_handler` - A function that will receive two parameters: result, e.
* `event_handler(result, e)` - The event handler that will be called on each "require".
  The event handler is passed a `result`, the result of the require (what is exposed through module.exports).
  `e` is the [information](#what-is-collected) describing the require.

---------------------------------------

<a name="getData" />
### getData()

Returns the collected data as an array.

---------------------------------------

<a name="getData_localToProject" />
### getData_localToProject()

Returns the collected data as an array, filtered with localToProject flag only.

---------------------------------------

<a name="getData_thirdParty" />
### getData_thirdParty()

Returns the collected data as an array, filtered with thirdParty (non-native) flag only.

---------------------------------------

<a name="getData_localThirdParty" />
### getData_localThirdParty()

Returns the collected data as an array, filtered with localToProject and thirdParty flags only.
This is useful when used with the config option alternateProjectPaths

---------------------------------------

<a name="filterData" />
### filterData(filter)

Returns the collected data as an array, filtered with the given filter set.

__Arguments__

* `filter` - An object with flags to filter

__Example__

    var result = require-hook.filterData({native: false, localToProject: true, thirdParty: true});

    var result = require-hook.filterData({native: false, thirdParty: true});

### License

require-hook is licensed under the MIT License

### Changelog

* 0.1.2: minor changes

* 0.1.1: License change to MIT

* 0.1.0: Initial version

### Third-party libraries

The following third-party libraries are used:

* lodash: https://lodash.com/