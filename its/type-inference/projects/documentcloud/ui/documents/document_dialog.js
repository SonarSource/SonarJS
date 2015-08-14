// Document dialog shows all user-editable attributes. Can be applied on multiple
// documents at once, sending a `Backbone.Model#save` per-document.
dc.ui.DocumentDialog = dc.ui.Dialog.extend({

  ATTRIBUTES : ['title', 'source', 'description', 'related_article', 'remote_url', 'access', 'language'],

  id        : 'edit_document_dialog',
  className : 'dialog docalog',

  events : {
    'click .cancel'     : 'close',
    'click .ok'         : 'save',
    'focus input'       : '_addFocus',
    'focus textarea'    : '_addFocus',
    'blur input'        : '_removeFocus',
    'blur textarea'     : '_removeFocus',
    'click .delete'     : 'destroy',
    'change .attribute' : '_markChanged'
  },
  
  // Takes multiple documents as a collection, since any changes are applied to
  // all documents.
  constructor : function(docs) {
    this.docs = docs;
    this.multiple = docs.length > 1;
    var title = _.t('edit_x', this._title() );
    dc.ui.Dialog.call(this, {mode : 'custom', title : title, editor : true});
    this.render();
    $(document.body).append(this.el);
  },

  // Renders a single form for multiple documents.
  render : function() {
    dc.ui.Dialog.prototype.render.call(this);
    this._container = this.$('.custom');
    this._container.html(JST['document/document_dialog']({
      docs     : this.docs, 
      multiple : this.multiple
    }));
    $('select[name=language]').val( this.docs[0].get('language') );
    var attrs = this._sharedAttributes();
    attrs['access'] = attrs['access'] || dc.access.PRIVATE;
    _.each(this.ATTRIBUTES, _.bind(function(attr) {
      $('#document_edit_' + attr).val(attrs[attr] || '');
    }, this));
    this.center();
    return this;
  },

  // For each attributes, if different any of the original attributes of each document,
  // saves the new attribute to each document using `Backbone.Model#save`.
  save : function() {
    var original = this._sharedAttributes();
    var changes = {};
    _.each(this.ATTRIBUTES, _.bind(function(attr) {
      var el = this.$('#document_edit_' + attr);
      if (!el.length) return;
      var next = el.val();
      if (attr == 'access') next = parseInt(next, 10);
      if (attr == 'related_article' || attr == 'remote_url') next = dc.inflector.normalizeUrl(next);
      if (next != original[attr] && el.hasClass('change')) changes[attr] = next;
    }, this));
    var errors = _.any(['related_article', 'remote_url'], _.bind(function(attr) {
      if (changes[attr] && !this.validateUrl(changes[attr])) {
        this.$('#document_edit_' + attr).addClass('error');
        return true;
      }
    }, this));
    if (errors) return false;
    this.close();
    if (!_.isEmpty(changes)) {
      _.each(this.docs, function(doc){ doc.save(changes); });
      if (!_.any(this.docs, function(doc) { return doc.suppressNotifier; })) {
        dc.ui.notifier.show({
          mode : 'info', 
          text : 'Updated ' + this.docs.length + ' ' +
                 dc.inflector.pluralize('document', this.docs.length)
        });
      }
    }
  },

  // Confirms deletion of multiple documents.
  destroy : function() {
    this.close();
    if (Documents.selected().length == 0) {
      this.docs[0].set({'selected': true});
    }
    Documents.verifyDestroy(Documents.selected());
  },

  // Sets the dialog title to include the number of documents or title of
  // the single document being edited.
  _title : function() {
    return (this.multiple) ? 
      _.t('x_documents',this.docs.length) :
      '"' + dc.inflector.truncate(this.docs[0].get('title'), 35) + '"';
  },

  // On change, mark input field as dirty.
  _markChanged : function(e) {
    $(e.target).addClass('change');
  },

  // Find the attributes that are common between all documents. Used to 
  // display those attributes in the fields. Fields that have different
  // values will be blank.
  _sharedAttributes : function() {
    return _.reduce(this.ATTRIBUTES, _.bind(function(memo, attr) {
      memo[attr] = Documents.sharedAttribute(this.docs, attr);
      return memo;
    }, this), {});
  }

}, {
  
  // This static method is used for conveniently opening the dialog for 
  // any selected documents.
  open : function(doc) {
    var docs = Documents.chosen(doc);
    if (!docs.length) return;
    if (!Documents.allowedToEdit(docs)) return;
    new dc.ui.DocumentDialog(docs);
  }

});
