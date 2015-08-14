// A tiny js library to perform string substitution for translation

// This is intended to be the simplest thing that could possibly work
// We'll build up from there as needs arise
//
// Uses the concept of translations packs
// which are JS Modules with the following form:

// var simple_pack = {
//   code: 'eng',
//   namespace: 'main',
//   nplurals: 2,
//   pluralizer: function(n){
//     return n ? 1 : 0;
//   },
//   strings: {
//     "not_found_project":"This project (%s) does not contain any documents.",
//     "no_reviewer_on_document":[
//       "The document %2$s does not have a reviewer",
//       "There are %d reviewers on document %s."
//     ]
//   }
// };
//
// Each pack is assigned:
//   A namespace.  This is the area where it will be utilized, i.e. WS for WorkSpace, DV for Document Viewer.
//   This is needed to accomodate loading multiple translation objects in the same page,
//   such as when the Viewer is embedded into the workspace
//
//   A language code.  The ISO 639-3 code that it corresponds to.
//
//   A pluralizer function.  This is takes a number and returns the index of the string that should be used.
//   Concept originated with gettext: http://www.gnu.org/software/gettext/manual/gettext.html#Plural-forms

// Example Usage:

// var encoding = new I18n( { namespace: 'main', language: 'spa', fallback: 'eng' } );
// _.t = encoding.translate

// This could also come before the object creation
// I18n.load( simple_pack );

// using the above pack as an example:

// _.t('not_found_project','TestingOnly')
// returns: "This project (TestingOnly) does not contain any documents."
//
// _.t('no_reviewer_on_document',2,'GoodDoc')
// would return: "There are 2 reviewers on document GoodDoc."
// but _.t('no_reviewer_on_document',1,'GoodDoc')
// would return: "The document GoodDoc does not have a reviewer."


// Special care has been taken to allow differing orders of initialization.  In some cases the library may be initialized
// before the packs are loaded, or it may be initalized and then the language codes changed later.


(function(root,undefined) {
  var _ = root._, jQuery = root.jQuery;

  var previousI18n = root.I18n;

  // There can be only one!
  if ( ! _.isUndefined( root.I18n ) )
    return;

  var LOG;
  if ( root.console ){
    LOG=window.console;
  } else {
    LOG = {
      warn: jQuery.noop, error: jQuery.noop
    };
  }

  // stores all available language
  // packs
  var ALL_PACKS = {};
  // keeps references to all i18n instances that are created.
  // This way they can all be contacted for reconfiguration when additional packs are loaded
  var ALL_INSTANCES = [];

  function I18n( options ){
    this.codes    = {};
    this.sprintf = root.sprintf.noConflict();
    this.reconfigure( options );
    this.translate = _.bind( this.translate, this );
    ALL_INSTANCES.push(this);
  };

  I18n.noConflict = function(){
    root.I18n = previousI18n;
    return this;
  };

  // static method.  Stores packs for
  // later use by individual translators
  I18n.load = function( pack ){
    if ( ALL_PACKS[ pack.namespace ] )
      ALL_PACKS[ pack.namespace ].push( pack );
    else
      ALL_PACKS[ pack.namespace ] = [ pack ];

    _.each( ALL_INSTANCES, function(lib){
      lib.reconfigure();
    });
    return true;
  };

  // private(ish) method to set either the
  // language or fallback code
  I18n.prototype._set = function( type, code ){
    if ( ! code ) {
      code = root.DC_LANGUAGE_CODES ? root.DC_LANGUAGE_CODES[ type ] : 'eng';
    }
    this.codes[ type ] = code;
    this[ type ] = this.packForCode( code );
    return this[ type ];
  };

  // reconfigure the language and fallback in use
  I18n.prototype.reconfigure = function( options ){
    if (_.isUndefined(options)){
      options=this.options;
    } else {
      this.options = options;
    }
    if ( ALL_PACKS[options.namespace] ){
      this.packs = ALL_PACKS[options.namespace];
    }

    if ( options.language ){
      var pack = this._set( 'language', options.language );
      if ( pack && _.isFunction( pack['initialize'] ) ) {
        pack.initialize();
      }
    }
    if ( options.fallback )
      this._set( 'fallback', options.fallback );
  };


  I18n.prototype.packForCode = function( code ){
    return _.detect( this.packs, function( pack ){
      return pack.code == code;
    });
  };


  // our raison d'etre.
  // Looks up a translation string for a given key
  // and applies pluralization & sprintf substitions to it
  I18n.prototype.translate = function( key, args ){

    var match, pack;
    pack = this.language;
    if ( ! pack || ! ( match = pack.strings[ key ] ) ){
      LOG.warn( '[i18n] lookup for ' + key + ' in \'' +
                ( pack ? pack.code : this.options.language + ' (missing)' ) +
                '\' failed.' );
      pack = this.fallback;
      if ( ! pack || ! ( match = pack.strings[ key ] ) ){
        LOG.error( '[i18n] lookup for ' + key + ' failed in all languages' );
        return key;  // something is better than nothing (perhaps?)
      }
    };

    // if the match is an array then perform an additional lookup
    // using the pluralization lookup rules from the pack
    if ( _.isArray( match ) ){
      // find either the indicated form, or the last form present if the proper
      // plural form is missing (because the translator didn't fill it out).
      var index = _.min([pack.pluralizer( _.isUndefined(args) ? 1 : args ), match.length-1 ]);
      match = match[ index ];
    }

    return this.sprintf.with_array( match, _.toArray( arguments ).slice(1) );

  };

  // export ourselves
  root.I18n = I18n;

})(this);
