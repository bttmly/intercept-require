/**
 * Created by Ralph Varjabedian on 11/11/14.
 * require-hook is licensed under the [MIT]
 * do not remove this notice.
 */
'use strict';

module.exports = {
  copyProperties: function(src, dst) {
    for(var prop in src) {
      if(src.hasOwnProperty(prop)) {
        dst[prop] = src[prop];
      }
    }
  }
};
