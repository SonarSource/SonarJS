// Simple dialog used to set a publication date for multiple documents. This
// changes a document's access level to public (from private or organization).
dc.ui.PublicationDateDialog = dc.ui.Dialog.extend({

  id        : 'pubdate_dialog',
  className : 'dialog',

  events : {
    'click .cancel'     : 'close',
    'click .ok'         : 'save',
    'click .delete'     : 'removeDate',
    'click .public_now' : 'editAccess'
  },

  // Takes an array of Document models. Checks permissions and renders the dialog.
  constructor : function(docs) {
    if (!Documents.allowedToEdit(docs)) return;
    this.docs = docs;
    this.multiple = docs.length > 1;
    var title = _.t('set_publication_date_for', this._title() );
    dc.ui.Dialog.call(this, {
      mode        : 'custom',
      title       : title,
      editor      : true,
      closeText   : _.t('cancel'),
      deleteText  : _.t('remove')
    });
    this.render();
    $(document.body).append(this.el);
  },

  // Builds the dialog template using the initialized array of documents.
  render : function() {
    dc.ui.Dialog.prototype.render.call(this);
    this._container = this.$('.custom');
    var publishAt = Documents.sharedAttribute(this.docs, 'publish_at');
    var oneHour = 60 * 60 * 1000;
    this._container.html(JST['document/publication_date_dialog']({
      documentCount: this.docs.length,
      date:     publishAt ? 
                DateUtils.parseRfc(publishAt) : 
                new Date(+(new Date) + oneHour)
    }));
    this.center();
    return this;
  },

  // If the user opts to change access levels immediately, close this dialog
  // and open up the `editAccess` dialog that's constructed in the `Documents`
  // collection.
  editAccess : function() {
    this.close();
    Documents.editAccess(this.docs);
  },

  // Validation and saving `publish_at` field to each `Document` model.
  save : function() {
    var date = this._getDate();
    if (date < new Date) {
      this.close();
      dc.ui.Dialog.alert(_.t('no_past_publication') );
      return;
    }
    var utc = JSON.stringify(date);
    _.each(this.docs, function(doc){ doc.save({publish_at : utc}); });
    this.close();
  },

  // Unset `publish_at`.
  removeDate : function() {
    _.each(this.docs, function(doc){ doc.save({publish_at : null}); });
    this.close();
  },

  // Helper method that constructs a title for multiple documents.
  _title : function() {
    if (this.multiple) return _.t('x_documents', this.docs.length );
    return '"' + dc.inflector.truncate(this.docs[0].get('title'), 35) + '"';
  },

  // Helper method that reads the date form fields (month, day, year, time)
  // and constructs a JavaScript `Date` object.
  _getDate : function() {
    return new Date(
      this.$('.date_year').val(),
      parseInt(this.$('.date_month').val(), 10) - 1,
      this.$('.date_day').val(),
      this.$('.date_hour').val()
    );
  }

});
