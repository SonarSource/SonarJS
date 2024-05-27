//Model._getSchema = function _getSchema (path) {
function _getSchema (path) {
  // var schema = this.schema
  //   , pathschema = schema.path(path);
  // if (pathschema)
  //   return pathschema;
  var schema = {
    path: () => {}
  };

  // look for arrays
  return (function search (parts, schema) {
    var p = parts.length + 1
      , foundschema
      , trypath
    while (p--) {
      trypath = parts.slice(0, p).join('.');
      foundschema = schema.path(trypath); // Noncompliant: schema can be undefined
      if (foundschema) {
        if (foundschema.caster) {
          // array of Mixed?
          if (foundschema.caster instanceof Types.Mixed) {
            return foundschema.caster;
          }
          // Now that we found the array, we need to check if there
          // are remaining document paths to look up for casting.
          // Also we need to handle array.$.path since schema.path
          // doesn't work for that.
          // Note: gh-1572, need to make sure the foundschema has a schema
          // attr, else we'll get bad errors here
          if (p !== parts.length && foundschema.schema) {
            if ('$' === parts[p]) {
              // comments.$.comments.$.title
              return search(parts.slice(p+1), foundschema.schema);
            } else {
              // this is the last path of the selector
              return search(parts.slice(p), foundschema.schema);
            }
          }
        }
        return foundschema;
      }
    }
  })(path.split('.'), schema)
}

_getSchema('foo');
