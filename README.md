## require-hook - a node.js utility that allows you to do performance profiling at the functions level 

[![NPM](https://nodei.co/npm/require-hook.png?mini=true)](https://nodei.co/npm/require-hook/)

* [Features](#features)
* [Getting started and configuration](#getting-started)
* [What is collected?](#what-is-collected)
* [The command line](#the-command-line)
* [Examples](#examples)
* [How it works and limitations](#limitations)
* [Failure points](#failure-points)
* [License](#license)
* [Changelog](#changelog)
* [Third-party libraries](#third-party-libraries)
* [Contact](#contact)

### Features

* Profiler that can dynamically hook to your code and collect performance statistics on the functions level.
* **Command line tools** to run the profiler directly on existing code.
* Can be used on the **command line** as well as a **library**

### Getting started

    $ npm install require-hook

Simply:

    $ cd /path/to/your/source/root
    $ require-hook

and this will run your project in "monitoring" state, after you are done using your project, stop the profiler and look for the require-hook.json file which will contain performance information.
The profiler will also periodically flush the data into the file.

### What is collected

Inside the require-hook.json you will find an object with parameter names pointing to (file names:function names). Inside individual objects, you will find two properties: count and total. The count will have the number of times this function was called and the total will have the accumulated total time spent in milliseconds.

### The command line

The command line arguments you pass serve the purpose of modifying one or more configuration properties found in [./config.js](http://bitbucket.org/ralphv/require-hook/src/master/config.js).
The format of the arguments is in the form of X=Y, check the next samples. 

    $ require-hook param=value
    $ require-hook 'param=value with spaces'
    $ require-hook 'array_param=["array element 1", "array element 2"]'
    $ require-hook array_param=element_one,element_two,element_three

Available configuration parameters:

      verbose=(integer)
              by default 0, can be 1,2 or 3 for more verbose information

      alternateProjectPaths=(array of strings)
              by default require-hook only hooks to the files local to your project
              you can add more paths to include in the monitoring as well

      skipAttach=(array of strings)
              an array of strings that will be skipped from monitoring
              it will match sub strings

      includeAttach=(array of strings)
              an array of strings that will be added to monitoring 
              even if the usual conditions are not met (native,json,third-party...)

      runGrunt=(string)
              pass a grunt command in this option and it will profile it

      includeThirdParty=(boolean)
              by default third party libraries are not hooked
              
      safeAsyncDetection=(boolean)
              by default true, if you don't experience problems with false, keep it false.                        

### Examples

    $ require-hook

run profiler in your current working directory

    $ require-hook runGrunt=test

profile the equivalent of "grunt test"  

    $ require-hook includeThirdParty=true

run profiler your current working directory and hook third party libraries as well

    $ require-hook . projectsRoot=/path/to/your/source/root 'alternateProjectPaths=["/path/to/your/source/root/commonLib"]'

run profiler in your current working directory, giving it a root folder for all your nodejs projects path and allowing hookup on a common library

    $ require-hook . projectsRoot=/path/to/your/source/root alternateProjectPaths=/path/to/your/source/root/commonLib 'skipAttach=["connection", "db.js"]'

similar to the previous command, but skip attaching to any required file containing the sub-strings connection or db.js

### Limitations

require-hook hooks and modifies how the default node require works. It will intercept all calls to require and will check the returned values from them.
It will hook on any functions it finds from require result (module.exports).

So if you have some functions that are defined internally inside a file and not exported in one way or another, require-hook can't know about them,
you will either need to export them or manually attach to them.

You can manually attach to functions via attachMonitor function.
You can also manually do profiling for specific tasks you want by the use of begin/end functions.

In order to time things correctly, require-hook needs to know whether the function you are calling is called in async or in sync mode.
To differentiate between the two, it tests for the last parameter passed to the function being called, if it is of type "function" then it assumes that this function is an asynchronous function and that the last parameter is the callback function.
SafeAsyncDetection mode, which is by default on, will also test for the parameter name to match one of the values in callbackNames. 
You can try turning it off, if your project passes without problems, then better keep it off, so it won't miss async detection.  

In order to minimize the unnecessary hooks, any "require"s from third party libraries, native, json are automatically ignored.
You can hook third party libraries with a configuration option.

### Failure Points

* if the target project tests for (require.main === module), i.e.: testing whether the started process is the project itself, this will fail.
* if the target project processes command line arguments by order, it might fail since the arguments contain one more (require-hook command itself).

### License

require-hook is licensed under the [BSD-3 License](http://bitbucket.com/ralphv/require-hook/raw/master/LICENSE).

### Changelog

* 0.1.4: better engine at hooking functions, some minor changes.

* 0.1.3: adding reporters and the first reporter is high-charts

* 0.1.2: fixing verbose levels (3) and adding runGrunt option to profile grunt tasks

* 0.1.1: Adding configuration option includeThirdParty

* 0.1.0: Initial version

### Third-party libraries

The following third-party libraries are used:

* lodash: https://lodash.com/

### Contact

Contact me directly on [bitbucket](https://bitbucket.org/ralphv/) or email me npm[AT]sandmik.com 

