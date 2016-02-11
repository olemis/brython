
/* Intern configuration

In order to override dojo loader with require.js there should be
a global `amd` variable bound to an object containing, at least,
the following attributes.

  - loader_path:    Path/URL pointing at AMD loader file (e.g. require.js)

Alternatively, if using Intern browser client, it is possible to supply
the AMD loader script path/URL via `amdLoader=<URL>` argument when invoking
client.html e.g. http://localhost/intern/client.html?amdLoader=http://localhost/requirejs/require.js
*/

;(function() {
  // See stackoverflow:2976651
  var stk = new Error().stack.split('\n');
      idx = 0;
  for (var i in stk) {
    if (!stk[i].match(/http[s]?:\/\//)) continue;
    idx = Number(i) + 1;
    break;
  }
  var path_parts = stk[idx].match(/((http[s]?:\/\/.+\/)([^\/]+\.js)):/),
      path_base = (path_parts? path_parts[2]: '') + '../',
      path_requirejs_cdn = 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.1.22/require.min.js',
      amd_loader_arg = location.search.match(/[?&]amdLoader=([^&]+)/),
      cfg_loader = {'host-node' : 'requirejs',
                    'host-browser' : this['amd']? amd.loader_path :
                                     (amd_loader_arg? amd_loader_arg[1] :
                                                      path_requirejs_cdn)};
      cfg_loader_options = {baseUrl: 'src/amd',
                            paths: {'brython_tests' : '../../tests/amd/brython_tests'}}

  define({
    basePath: path_base,
    suites: ['brython_tests/tkn'],
    // Intern 2.0
    useLoader: cfg_loader,
    loader: cfg_loader_options,
    // Intern 3.0
    loaders: cfg_loader,
    loaderOptions: cfg_loader_options
  })
})()

