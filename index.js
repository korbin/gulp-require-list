'use strict';

var through2 = require('through2');
var objectPath = require('object-path');
var File = require('vinyl');
var path = require('path');

var generateDefaultManifest = function(manifest) {
  var out = ["'use strict';\n\n"];

  manifest.files.forEach(function(rp) {
    var name = rp.split(path.sep).slice(-1)[0];
    name = name[0].toUpperCase() + name.slice(1);

    out.push("exports." + name + " = require('./" + rp + "');\n");
  });

  return out.join('');
};

module.exports = function(options, overrideDefaultManifest) {
  var _manifests = {};
  var manifestGenerator = overrideDefaultManifest || generateDefaultManifest;


  return through2.obj(function (file, enc, cb) {
    if (file.isNull()) return cb(null, file);
    if (file.isStream()) throw new Error('No support for streams');

    var dirPath = path.dirname(file.relative);
    var option = options[dirPath];

    if (option) {
      var manifestPath = dirPath;
      if (option !== true) {
        manifestPath = option;
      }

      manifestPath += '.js'

      var manifestDir = path.dirname(manifestPath);
      var requirePath = path.relative(manifestDir, file.relative);
      requirePath = requirePath.replace(path.extname(requirePath), '');

      objectPath.ensureExists(_manifests, [manifestPath, 'path'], manifestPath);
      objectPath.push(_manifests, [manifestPath, 'files'], requirePath);
    }

    cb(null, file)
  }, function (cb) {
    for(var mp in _manifests) {
      var manifest = _manifests[mp];
      var contents = manifestGenerator(manifest);

      var mf = new File({
        path: mp,
        contents: new Buffer(contents)
      });

      this.push(mf);
    }
    cb();
  });
};
