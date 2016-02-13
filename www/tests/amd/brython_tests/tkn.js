;(function() {
  define (['brython/tkn', 'brython_tests/util',
           'intern!tdd', 'intern/chai!assert', 'intern/chai!expect'],
          function(tkn, util, tdd, assert, expect) {

            var token_types_rev = {};
            for (var nm in tkn.token_types) {
              token_types_rev[tkn.token_types[nm]] = nm;
            }

            function assert_token_match(tkn_expected, tkn_actual, index) {
              var prefix = "Token " + index + " : ";
              assert.equal(tkn_actual.length, 5,
                           prefix + "Length expected 5 but got " +
                           tkn_actual.length);

              var match = tkn_expected.match(
                  /^(\d+),(\d+)-(\d+),(\d+):\s+([A-Z]+)\s+(.*)$/);
              if (!match)
                  throw new Error('Corrupted test case - token ' + tkn_expected);

              assert.equal(tkn_actual[0], tkn.token_types[match[5]],
                           prefix + "Token type expected "+ match[5] + "(" +
                           tkn.token_types[match[5]] + ") but got " +
                           token_types_rev[tkn_actual[0]] +
                           " (" +tkn_actual[0] + ")");
              // CPython always binds DEDENT tokens to an empty string
              // For our convinience values bound to DEDENT tokens are the
              // matched whitespace sequences
              if (tkn_actual[0] != tkn.token_types.DEDENT) {
                var str_literal = "'" + util.escape_string(tkn_actual[1]) + "'";
                assert.equal(str_literal, match[6],
                             prefix + "Matched value expected "+ match[6] +
                             " but got " + str_literal);
              }
              expect(tkn_actual[2]).to.deep.equal(
                              [parseInt(match[1]), parseInt(match[2])],
                              prefix + "Start position expected " +
                              [match[1], match[2]] + " but got " + tkn_actual[2]);
              expect(tkn_actual[3]).to.deep.equal(
                              [parseInt(match[3]), parseInt(match[4])],
                              prefix + "End position expected "+
                              [match[3], match[4]] + " but got " + tkn_actual[3]);
            }

            function assert_tokens_match(script_text, expected) {
              token_stream = tkn.tokenize(script_text);
              var item = token_stream.next(),
                  dontstop = !item.done;
              var i = 0;
              while(dontstop) {
                var tkn_got = item.value;
                expect(i).to.be.below(expected.length);
                var tkn_exp = expected[i];
                assert_token_match(tkn_exp,tkn_got, i);
                ++i;
                item = token_stream.next();
                dontstop = !item.done;
              }
              expect(i).to.equal(expected.length);
            }

            tdd.suite('Lexical analysis', function() {
              tdd.suite('Tokenizer - Contributed samples', function() {
                tdd.test('Lexically valid but wrong syntax', function() {
                  assert_tokens_match(
                    [
                      "#!/usr/bin/env python",
                      "# -*- coding: ascii -*-",
                      "",
                      "month_names = ['Januari', 'Februari', 'Maart', # These are the",
                      "               'April', 'Mei', 'Juni', # Dutch names",
                      "               'Juli', 'Augustus', 'September', # for the months",
                      "               'Oktober', 'November', 'December'] # of the year",
                      "",
                      "def x():",
                      "    a = \\",
                      "    \"\"\"eyruyetruyt \\",
                      "       ferhugf",
                      "     233ew\"\"\" 'erty' # Comment",
                      "    pass",
                      "    c = ( 1 + 2[ ) ]",
                      "    b = b'''wqdewoefoi\\2",
                      "        wqe34rfy6'''",
                      "    if x:",
                      "        return 3",
                      "",
                      ""
                    ].join('\n'),
                    [
                        "0,0-0,0:            ENCODING       'ascii'",
                        "1,0-1,21:           COMMENT        '#!/usr/bin/env python'",
                        "1,21-1,22:          NL             '\\n'",
                        "2,0-2,23:           COMMENT        '# -*- coding: ascii -*-'",
                        "2,23-2,24:          NL             '\\n'",
                        "3,0-3,1:            NL             '\\n'",
                        "4,0-4,11:           NAME           'month_names'",
                        "4,12-4,13:          OP             '='",
                        "4,14-4,15:          OP             '['",
                        "4,15-4,24:          STRING         '\\'Januari\\''",
                        "4,24-4,25:          OP             ','",
                        "4,26-4,36:          STRING         '\\'Februari\\''",
                        "4,36-4,37:          OP             ','",
                        "4,38-4,45:          STRING         '\\'Maart\\''",
                        "4,45-4,46:          OP             ','",
                        "4,47-4,62:          COMMENT        '# These are the'",
                        "4,62-4,63:          NL             '\\n'",
                        "5,15-5,22:          STRING         '\\'April\\''",
                        "5,22-5,23:          OP             ','",
                        "5,24-5,29:          STRING         '\\'Mei\\''",
                        "5,29-5,30:          OP             ','",
                        "5,31-5,37:          STRING         '\\'Juni\\''",
                        "5,37-5,38:          OP             ','",
                        "5,39-5,52:          COMMENT        '# Dutch names'",
                        "5,52-5,53:          NL             '\\n'",
                        "6,15-6,21:          STRING         '\\'Juli\\''",
                        "6,21-6,22:          OP             ','",
                        "6,23-6,33:          STRING         '\\'Augustus\\''",
                        "6,33-6,34:          OP             ','",
                        "6,35-6,46:          STRING         '\\'September\\''",
                        "6,46-6,47:          OP             ','",
                        "6,48-6,64:          COMMENT        '# for the months'",
                        "6,64-6,65:          NL             '\\n'",
                        "7,15-7,24:          STRING         '\\'Oktober\\''",
                        "7,24-7,25:          OP             ','",
                        "7,26-7,36:          STRING         '\\'November\\''",
                        "7,36-7,37:          OP             ','",
                        "7,38-7,48:          STRING         '\\'December\\''",
                        "7,48-7,49:          OP             ']'",
                        "7,50-7,63:          COMMENT        '# of the year'",
                        "7,63-7,64:          NEWLINE        '\\n'",
                        "8,0-8,1:            NL             '\\n'",
                        "9,0-9,3:            NAME           'def'",
                        "9,4-9,5:            NAME           'x'",
                        "9,5-9,6:            OP             '('",
                        "9,6-9,7:            OP             ')'",
                        "9,7-9,8:            OP             ':'",
                        "9,8-9,9:            NEWLINE        '\\n'",
                        "10,0-10,4:          INDENT         '    '",
                        "10,4-10,5:          NAME           'a'",
                        "10,6-10,7:          OP             '='",
                        "11,4-13,13:         STRING         '\"\"\"eyruyetruyt \\\n       ferhugf\n     233ew\"\"\"'",
                        "13,14-13,20:        STRING         \"'erty'\"",
                        "13,21-13,30:        COMMENT        '# Comment'",
                        "13,30-13,31:        NEWLINE        '\\n'",
                        "14,4-14,8:          NAME           'pass'",
                        "14,8-14,9:          NEWLINE        '\\n'",
                        "15,4-15,5:          NAME           'c'",
                        "15,6-15,7:          OP             '='",
                        "15,8-15,9:          OP             '('",
                        "15,10-15,11:        NUMBER         '1'",
                        "15,12-15,13:        OP             '+'",
                        "15,14-15,15:        NUMBER         '2'",
                        "15,15-15,16:        OP             '['",
                        "15,17-15,18:        OP             ')'",
                        "15,19-15,20:        OP             ']'",
                        "15,20-15,21:        NEWLINE        '\\n'",
                        "16,4-16,5:          NAME           'b'",
                        "16,6-16,7:          OP             '='",
                        "16,8-17,20:         STRING         \"b'''wqdewoefoi\\2\n        wqe34rfy6'''\"",
                        "17,20-17,21:        NEWLINE        '\\n'",
                        "18,4-18,6:          NAME           'if'",
                        "18,7-18,8:          NAME           'x'",
                        "18,8-18,9:          OP             ':'",
                        "18,9-18,10:         NEWLINE        '\\n'",
                        "19,0-19,8:          INDENT         '        '",
                        "19,8-19,14:         NAME           'return'",
                        "19,15-19,16:        NUMBER         '3'",
                        "19,16-19,17:        NEWLINE        '\\n'",
                        "20,0-20,1:          NL             '\\n'",
                        "21,0-21,1:          NL             '\\n'",
                        "22,0-22,0:          DEDENT         ''",
                        "22,0-22,0:          DEDENT         ''",
                        "22,0-22,0:          ENDMARKER      ''"
                     ]);
                })
              });

              tdd.suite('Tokenizer - Python Language Reference samples', function() {
                tdd.test('Tokenizer - LangRef - Explicit line joining', function() {
                  assert_tokens_match(
                    [
                      "if 1900 < year < 2100 and 1 <= month <= 12 \\",
                      "    and 1 <= day <= 31 and 0 <= hour < 24 \\",
                      "    and 0 <= minute < 60 and 0 <= second < 60: # Looks like a valid date",
                      "        return 1"
                    ].join('\n'),
                    [
                      "0,0-0,0:            ENCODING       'utf-8'",
                      "1,0-1,2:            NAME           'if'",
                      "1,3-1,7:            NUMBER         '1900'",
                      "1,8-1,9:            OP             '<'",
                      "1,10-1,14:          NAME           'year'",
                      "1,15-1,16:          OP             '<'",
                      "1,17-1,21:          NUMBER         '2100'",
                      "1,22-1,25:          NAME           'and'",
                      "1,26-1,27:          NUMBER         '1'",
                      "1,28-1,30:          OP             '<='",
                      "1,31-1,36:          NAME           'month'",
                      "1,37-1,39:          OP             '<='",
                      "1,40-1,42:          NUMBER         '12'",
                      "2,4-2,7:            NAME           'and'",
                      "2,8-2,9:            NUMBER         '1'",
                      "2,10-2,12:          OP             '<='",
                      "2,13-2,16:          NAME           'day'",
                      "2,17-2,19:          OP             '<='",
                      "2,20-2,22:          NUMBER         '31'",
                      "2,23-2,26:          NAME           'and'",
                      "2,27-2,28:          NUMBER         '0'",
                      "2,29-2,31:          OP             '<='",
                      "2,32-2,36:          NAME           'hour'",
                      "2,37-2,38:          OP             '<'",
                      "2,39-2,41:          NUMBER         '24'",
                      "3,4-3,7:            NAME           'and'",
                      "3,8-3,9:            NUMBER         '0'",
                      "3,10-3,12:          OP             '<='",
                      "3,13-3,19:          NAME           'minute'",
                      "3,20-3,21:          OP             '<'",
                      "3,22-3,24:          NUMBER         '60'",
                      "3,25-3,28:          NAME           'and'",
                      "3,29-3,30:          NUMBER         '0'",
                      "3,31-3,33:          OP             '<='",
                      "3,34-3,40:          NAME           'second'",
                      "3,41-3,42:          OP             '<'",
                      "3,43-3,45:          NUMBER         '60'",
                      "3,45-3,46:          OP             ':'",
                      "3,47-3,72:          COMMENT        '# Looks like a valid date'",
                      "3,72-3,73:          NEWLINE        '\\n'",
                      "4,0-4,8:            INDENT         '        '",
                      "4,8-4,14:           NAME           'return'",
                      "4,15-4,16:          NUMBER         '1'",
                      "4,16-4,17:          NEWLINE        '\\n'",
                      "5,0-5,0:            DEDENT         ''",
                      "5,0-5,0:            ENDMARKER      ''"
                    ]);
                });

                tdd.test('Tokenizer - LangRef - Explicit line joining', function() {
                });

              });
            })
          })
 })() 
