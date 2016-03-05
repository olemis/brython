
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

  // FIXME : More reliable check for browser vs node.js
  var is_browser = typeof window !== 'undefined';

  function browser_params() {
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
        cfg_loader = {'host-browser' : this['amd']? amd.loader_path :
                                       (amd_loader_arg? amd_loader_arg[1] :
                                                        path_requirejs_cdn)};
        cfg_loader_options = {baseUrl: path_base + 'src/amd',
                              paths: {'brython_tests' : path_base + 'tests/amd/brython_tests'}}
    console.log('Running browser tests from base path : ' + path_base);
    return {basePath: '.',
            // Intern 2.0
            useLoader: cfg_loader,
            loader: cfg_loader_options,
            // Intern 3.0
            loaders: cfg_loader,
            loaderOptions: cfg_loader_options}
  }

  function node_params() {
    // See stackoverflow:2976651
    var stk = new Error().stack.split('\n');
        idx = 0;
    var path_parts = null;
    for (idx in stk) {
      if (!(path_parts = stk[idx].match(/at ((\/.+\/)([^\/]+\.js)):\d+:\d+$/))) continue;
      break;
    }
    var path_base = (path_parts? path_parts[2]: '') + '../',
        cwd_parts = process.cwd().split('/');
    path_parts = path_base.split('/');
    for (idx = 0, pl = path_parts.length, cwdl = cwd_parts.length;
         idx < pl && idx < cwdl; ++idx) {
      if (path_parts[idx] != cwd_parts) break;
    }
    var relpath = []
    for (var i = idx; i < cwdl.length; ++i) relpath.push('..');
    for (var i = idx; i < path_parts.length; ++i) relpath.push(path_parts[i]);
    relpath = relpath.join('/');
    console.log('Running node tests from base path : ' + relpath);
    var cfg_loader_options = {baseUrl: 'src/amd',
                              paths: {'brython_tests' : '../../tests/amd/brython_tests'}}
    return {basePath: relpath,
            // Intern 2.0
            loader: cfg_loader_options,
            // Intern 3.0
            loaderOptions: cfg_loader_options}
  }

  define(function() {
    var params = (is_browser? browser_params: node_params)();
    params.suites = ['brython_tests/tkn'];
    // See stackoverflow:31907152
    params.excludeInstrumentation = /^(?:tests|node_modules)\//;
    return params;
  });
})()

