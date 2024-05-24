'use strict';

var lizMap = (function () {
  var config = {
    layers: {
      foo: {
        title: 'layerTitle',
        displayInLayerSwitcher: true,
        displayInLegend: true,
        visibility: true,
        opacity: 1,
        queryable: true,
      },
    },
  };
  var wfsCapabilities = {
    getElementsByTagName: function (tagName) {
      return [
        {
          getElementsByTagName: function (tagName) {
            return [
              {
                textContent: 'layerName',
              },
            ];
          },
        },
      ];
    },
  };
  var typeNameMap = {};
  var shortNameMap = {};

  function getVectorLayerFeatureTypes() {
    if (wfsCapabilities == null) {
      return [];
    }
    return wfsCapabilities.getElementsByTagName('FeatureType');
  }

  function getNameByTypeName(typeName) {
    var name = null;
    if (typeName in typeNameMap) name = typeNameMap[typeName];
    return name;
  }

  // creating the lizMap object
  var obj = {
    /**
     * Method: init
     */
    init: function () {
      var p = Promise.resolve(42);

      // Request config and capabilities in parallel
      Promise.allSettled([p])
        .then(responses => {
          var featureTypes = getVectorLayerFeatureTypes();

          for (const featureType of featureTypes) {
            var typeName = featureType.getElementsByTagName('Name')[0].textContent;
            var layerName = lizMap.getNameByTypeName(typeName);
            if (!layerName) {
              if (typeName in config.layers) layerName = typeName;
              else if (typeName in shortNameMap && shortNameMap[typeName] in config.layers)
                layerName = shortNameMap[typeName];
              else {
                for (var l in config.layers) {
                  if (l.split(' ').join('_') == typeName) {
                    layerName = l;
                    break;
                  }
                }
              }
            }

            if (!(layerName in config.layers)) continue;

            var configLayer = config.layers[layerName];
            configLayer.typename = typeName;
            typeNameMap[typeName] = layerName;
          }
        })
        .catch(error => {})
        .finally(() => {});
    },

    getNameByTypeName: function (typeName) {
      return getNameByTypeName(typeName);
    },
  };

  return obj;
})();

(function () {
  // initialize LizMap
  lizMap.init();
})();
