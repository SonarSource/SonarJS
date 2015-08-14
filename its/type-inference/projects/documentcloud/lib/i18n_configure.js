(function(root,undefined) {

  var _ = root._;

  var langopts = root.DC_LANGUAGE_CODES ? _.clone(root.DC_LANGUAGE_CODES) : { language: 'eng', fallback: 'eng' };
  langopts.namespace = 'WS';

  var i18n = new root.I18n( langopts );

  _.mixin({
    t: i18n.translate
  });

})(this);
