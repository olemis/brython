
define({
  'escape_string' : function(str) {
    return ('' + str).replace(/["'\\\n\r\u2028\u2029]/g, function(ch) {
      switch(ch) {
        case '"' :
        case '\\' :
        case "'" :
          return '\\' + ch;
        case '\n' :
          return '\\n';
        case '\r' :
          return '\\r';
        case '\u2028' :
          return '\\u2028';
        case '\u2029' :
          return '\\u2029';
      }
    })
  },
})

