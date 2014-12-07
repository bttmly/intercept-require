/**
 * Created by Ralph Varjabedian on 11/11/14.
 * require-hook is licensed under the [MIT]
 * do not remove this notice.
 */

console.log1 = function() {
  console.log.apply(this, ["\033[1;34m[require-hook]\033[0m"].concat(Array.prototype.slice.call(arguments, 0)));
};

console.warn1 = function() {
  console.warn.apply(this, ["\033[1;31m[require-hook]\033[0m"].concat(Array.prototype.slice.call(arguments, 0)));
};

module.exports = require("./lib/requireHook.js");