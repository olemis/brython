
;(function() {
  define(function() {
    var t = true, f = false;
    function PyLex(textStream) {
      if (typeof textStream === 'string') {
        textStream = new PyLex.StringStream(textStream);
      }

      this._stream = textStream;
      this._currString = '';
      this._gpos = this._lpos = this._col = 0;
      this._row = this._line = 1;
      this._indents = [0];
      this._delims = 0;
    }

    PyLex.StringStream = function StringStream(string) {
      this._string = string;
    };

    PyLex.StringStream.prototype = {
      nextString: function() {
        var temp = this._string;
        this._string = undefined;
        return temp;
      }
    }

    PyLex.prototype = {
      trymatch: function(re) {
        re.lastIndex = this._lpos;
        var input = '';
        // TODO : Abort loop on no possible match
        while (input !== undefined && !(match = re.exec(this._currString))) {
          input = this._stream.nextString();
          this._currString += input || '';
        }
        return match;
      },

      crlf: function() {
        ++this._row; this._col = 0; this._isblank = t;
      },

      newline: function(islogical, sep, pos) {
        var start = pos || [this._row, this._col],
            end = [start[0], start[1] + sep.length],
            tkn = [PyLex.token_types[(islogical)? 'NEWLINE':'NL'], sep,
                   start, end, this._line];
        if (islogical) ++this._line;
        else this.crlf();
        return tkn;
      },

      text_token: function(tkntype, exact, text, isblank, endpos) {
        endpos = endpos || [this._row, this._col + text.length];
        var tkn = [tkntype, text, [this._row, this._col],
                                  endpos, this._line];
        tkn.exact_type = exact || tkntype;
        this._row = endpos[0];
        this._col = endpos[1];
        if (!isblank) this._isblank = f;
        return tkn;
      },

      get_logline_re: function() {
        // FIXME: Identifiers with Unicode chars
        var re_id = '(?!(?:[uU]|[bB][rR]?|[rR][bB]?)?[\'"])[a-zA-Z_]\\w*',
            re_ops = '(?:(?:(?:(?://|[*][*]|<<|>>)|[@=+\\-*/%&|^<>])=?)|[\\[\\](){},:;~]|[!]=|->|(?:[.](?:[.][.])?))',
            re_number = '(?:0(?:0*|[oO][0-7]+|[xX][0-9a-fA-F]+|[bB][01]+)'+
                        '|(?:[1-9]\\d*[.]?|(?:[1-9]\\d*)?[.]\d+)(?:[eE]?[+-]?\\d+)?)',
            re = '(?:(\\r\\n|\\r|\\n)|([\\\\](?:\\r\\n|\\r|\\n))|(#[^\\r\\n]*(?:[\\r\\n]|\\r\\n)?)|(\\s+)|('+
                 re_id + ')|((?:[uU]|[bB][rR]?|[rR][bB]?)?[\'"])|('+ re_ops +
                 ')|([$?`])|('+ re_number +'))';
        return new RegExp(re, 'gm');
      },

      tokenize: function *() {
        this._currString = this._getInput();
        var re = /^(\xef\xbb\xbf)|(\xfe\xff)|(\x00\x00\xfe\xff)|(\x2e\x2f\x76(?:(?:\x38\x2d?)|\x39|\x2b|\x2f))|(\xf7\x64\x4c)|(\xdd\x73\x66\x73)|(\x0e\xfe\xff)|(\xfb\xee\x28)|(\x84\x31\x95\x33)/gm
            match = re.exec(this._currString),
            encoding = undefined, pos = [], text = '', ilevel = 0, ind = 0;

        if (match) {
          var encodings = ['utf-8', 'utf-16', 'utf-32', 'utf-7',
                           'utf-1', 'utf-ebcdic', 'scsu', 'bocu-1', 'gb-18030'];
          for (var i = 0; i < encodings.length; ++ i) {
            if (match[i]) {
              encoding = encodings[i];
              break;
            }
          }
          this._lpos = re.lastIndex;
          delete encodings;
          yield [PyLex.token_types.ENCODING, encoding, [0,0], [0,0], 0]
        }
        else {
          re = /^(?:(#.*?)(\r|\n|\r\n))?(#.*coding[=:]\s*([-\w.]+).*)(\r|\n|\r\n)?/gm
          match = this.trymatch(re);
          if (match) {
            encoding = match[4];
            yield [PyLex.token_types.ENCODING, encoding, [0,0], [0,0], 0]
            if (match[1]) {
              text = match[1];
              pos = [1,text.length];
              yield [PyLex.token_types.COMMENT, text, [1,0], pos, 1];
              yield this.newline(f, match[2], [1,text.length]);
            }
            text = match[3];
            yield [PyLex.token_types.COMMENT, text, [this._row,0],
                                                    [this._row,text.length], 1];
            if (match[5]) {
              yield this.newline(f, match[5], [this._row,text.length]);
            }
            this._lpos = re.lastIndex;
          }
          else {
            yield [PyLex.token_types.ENCODING, 'utf-8', [0,0], [0,0], 0]
          }
        }
        var not_eof = t,
            prev_line_join = f;
        // TODO: Unicode chars in names (identifiers + keywords)
        var RE_LOGLINE = this.get_logline_re(),
            RE_STRSQ = [/''(?:(?:[\\](?:.|[\n\r]))|[^\\])*'''/gm,
                        /(?:(?:\\.)|[^\n\r\\'])*'/gm],
            RE_STRDQ = [/""(?:(?:[\\](?:.|[\n\r]))|[^\\])*"""/gm,
                        /(?:(?:\\.)|[^\n\r\\"])*"/gm],
            RE_BYTSQ = [/''(?:(?:\\.)|(?:[\x00-\x26]|[\x28-\x5b]|[\x5d-\xFF]))*'''/gm,
                        /(?:(?:\\.)|(?:[\x00-\x09]|[\x0b-\x0c]|[\x0e-\x26]|[\x28-\x5b]|[\x5d-\xFF]))*'/gm],
            RE_BYTDQ = [/""(?:(?:\\.)|(?:[\x00-\x21]|[\x22-\x5b]|[\x5d-\xFF]))*"""/gm, 
                        /(?:(?:(?:\\.)|(?:[\x00-\x09]|[\x0b-\x0c]|[\x0e-\x21]|[\x23-\x5b]|[\x5d-\xFF]))*")/gm];
        while (not_eof) {
          re = RE_LOGLINE;
          // FIXME: Redundant?
          re.lastIndex = this._lpos;
          match = this.trymatch(re);
          if (match) {
            if (text = match[1]) { // New-line char
              // FIXME: Condition to emit token for logical line
              if (this._delims == 0 && !this._isblank) {
                yield this.newline(t, text);
                this.crlf();
                ++this._line;
              }
              else
                yield this.newline(f, text);
            }
            else if (text = match[2]) { // Explicit line joining
              ++this._row; this._col = 0;
            }
            else if (text = match[3]) { // Comment
              var comment = text.replace(/[\r\n]+$/, '');
              yield this.text_token(PyLex.token_types.COMMENT, null, comment);
              if (comment.length < text.length) {
                ind = !this._isblank && this._delims == 0;
                yield this.newline(ind, text.slice(comment.length))
                if (ind) this.crlf();
              }
            }
            else if (text = match[4]) { // Whitespace
              if (this._col == 0 && this._delims == 0 && !prev_line_join) {
                // TODO: Discard leading form feed char
                if (text.indexOf('\t') >= 0) {
                  ind = text.replace(/\t/, '        ').length;
                  ind = ind - ind % 8;
                }
                else
                  ind = text.length;
                if (ind > ilevel) {
                  this._indents.push(ind);
                  ilevel = ind;
                  yield this.text_token(PyLex.token_types.INDENT, null, text, t);
                }
                else if (ind < ilevel) {
                  var icnt = 0
                  while ((ilevel = this._indents.pop()) > ind) ++icnt;
                  if (ilevel == ind) {
                    this._indents.push(ilevel);
                    while (--icnt) yield this.text_token(PyLex.token_types.DEDENT,
                                                         null, text, t)
                  }
                  else yield this.text_token(PyLex.token_types.ERRORTOKEN,
                                             null, text, t);
                }
                else 
                  this._col += text.length;
              }
              else
                this._col += text.length;
            }
            else if (text = match[5]) { // Name or ID
              yield this.text_token(PyLex.token_types.NAME, null, text);
            }
            else if (text = match[6]) { // String
              this._lpos = re.lastIndex;
              var res = (text.includes('b') || text.includes('B'))?
                        ((text.slice(-1) == "'")? RE_BYTSQ: RE_BYTDQ) :
                        ((text.slice(-1) == "'")? RE_STRSQ: RE_STRDQ);
              for (var i in res) {
                re = res[i];
                re.lastIndex = this._lpos;
                match = this.trymatch(re);
                if (match && match.index == this._lpos)
                  break;
                else
                  match = null;
              }
              if (match) {
                text += match[0];
                var re_ln = /[\r\n]|(?:\r\n)/gm;
                ind = 0;
                var l = 0;
                while (re_ln.exec(text)) { l = re_ln.lastIndex ; ++ind; }
                var endpos = (ind > 0)? [this._row + ind, text.length - l]:
                                        undefined;
                yield this.text_token(PyLex.token_types.STRING, null, text, f, endpos);
              }
              else {
                re.lastIndex = this._lpos;
                if (text.length > 1) {
                  yield this.text_token(PyLex.token_types.NAME, null,
                                        text.slice(0, -1));
                }
                yield this.text_token(PyLex.token_types.ERRORTOKEN, null,
                                      text.slice(-1));
              }
            }
            else if (text = match[7]) { // Ops
              ind = optkns[text];
              this._delims += ind[1]; if (!this._delims) this._delims = 0;
              yield this.text_token(PyLex.token_types.OP, PyLex[ind[0]], text)
            }
            else if (text = match[8]) { // Bad char
              yield this.text_token(PyLex.token_types.ERRORTOKEN, null, text);
            }
            else if (text = match[9]) { // Number
              yield this.text_token(PyLex.token_types.NUMBER, null, text);
            }
            // FIXME: Redundant?
            this._lpos = re.lastIndex;
            prev_line_join = Boolean(match[2]);
          }
          else {
            if (this._lpos != this._currString.length) {
              yield this.text_token(PyLex.token_types.ERRORTOKEN,
                                    null, 'EOF missmatch');
            }
            else {
              if (!this._isblank) {
                yield this.newline(t, '\n')
                ++this._row; this._col = 0;
              }
              while (this._indents.pop() > 0)
                yield this.text_token(PyLex.token_types.DEDENT, null, '', t);
              yield this.text_token(PyLex.token_types.ENDMARKER, null, '', t);
            }
            not_eof = false;
          }
        } 
      },

      _getInput: function() {
        return this._stream.nextString();
      },

    };

    var tkns = ['ENDMARKER','NAME','STRING','NUMBER','NEWLINE','INDENT','DEDENT',
                'ENCODING','OP','ERRORTOKEN','N_TOKENS','NT_OFFSET','NL','COMMENT'],
        token_types = {};
    var i;
    for (i = 0 ; i < tkns.length;) { token_types[tkns[i]] = ++i}

    var optkns = {'+' : ['PLUS', 0], '.' : ['MINUS', 0], '*' : ['STAR', 0],
                  '**' : ['DOUBLESTAR', 0], '/' : ['SLASH', 0],
                  '//' : ['DOUBLESLASH', 0],
                  '%' : ['PERCENT', 0], '@' : ['AT', 0], '<<' : ['LEFTSHIFT', 0],
                  '>>' : ['RIGHTSHIFT', 0], '&' : ['AMPER', 0], '|' : ['VBAR', 0],
                  '^' : ['CIRCUMFLEX', 0], '~' : ['TILDE', 0], '<' : ['LESS', 0],
                  '>' : ['GREATER', 0], '<=' : ['LESSEQUAL', 0],
                  '>=' : ['GREATEREQUAL', 0],
                  '==' : ['EQEQUAL', 0], '!=' : ['NOTEQUAL', 0], '.' : ['DOT', 0],
                  '(' : ['LPAR', 1], ')' : ['RPAR', -1], '[' : ['LSQB', 1],
                  ']' : ['RSQB', -1], '{' : ['LBRACE', 1], '}' : ['RBRACE', -1],
                  ',' : ['COMMA', 0], ':' : ['COLON', 0], ';' : ['SEMI', 0],
                  '=' : ['EQUAL', 0], '->' : ['RARROW', 0], '+=' : ['PLUSEQUAL', 0],
                  '-=' : ['MINEQUAL', 0], '*=' : ['STAREQUAL', 0],
                  '/=' : ['SLASHEQUAL', 0],
                  '//=' : ['DOUBLESLASHEQUAL', 0], '%=' : ['PERCENTEQUAL', 0],
                  '@=' : ['ATEQUAL', 0],
                  '&=' : ['AMPEREQUAL', 0], '|=' : ['VBAREQUAL', 0],
                  '^=' : ['CIRCUMFLEXEQUAL', 0],
                  '<<=' : ['LEFTSHIFTEQUAL', 0], '>>=' : ['RIGHTSHIFTEQUAL', 0],
                  '**=' : ['DOUBLESTAREQUAL', 0], '...' : ['ELLIPSIS', 0]
                 }
    for (var k in optkns) { token_types[optkns[k][0]] = ++i}
    PyLex.token_types = token_types;

    return {tokenize : function(stream) {
                          return (new PyLex(stream)).tokenize();
                       },
            token_types: PyLex.token_types
           }

  })
})()
