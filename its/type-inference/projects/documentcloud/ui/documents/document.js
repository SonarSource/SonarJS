// A tile view for previewing a Document in a listing.
dc.ui.Document = Backbone.View.extend({

  // Number of pages to show at a time.
  PAGE_LIMIT : 50,

  // To display if the document failed to upload.
  ERROR_MESSAGE : '<span class="interface">' + _.t('document_error_message',
                                                   '<span class="text_link troubleshoot">', '</span>',
                                                   '<span class="text_link contact_us">',   '</span>' ) +
    '</span>',

  className : 'document',

  events : {
    'click .doc_title'              : 'select',
    'contextmenu .doc_title'        : 'showMenu',
    'dblclick .doc_title'           : 'viewDocument',
    'click .icon.doc'               : 'select',
    'contextmenu .icon.doc'         : 'showMenu',
    'dblclick .icon.doc'            : 'viewDocument',
    'click .show_notes'             : 'toggleNotes',
    'click .title .edit_glyph'      : 'openDialog',
    'click .datalines .edit_glyph'  : 'openDataDialog',
    'click .title .lock'            : 'editAccessLevel',
    'click .title .published'       : 'viewPublishedDocuments',
    'click .page_icon'              : '_openPage',
    'click .reviewer_count'         : '_openShareDialog',
    'click .occurrence'             : '_openPage',
    'click .mention b'              : '_openPage',
    'click .pages .cancel_search'   : '_hidePages',
    'click .page_count'             : '_togglePageImages',
    'click .search_account'         : 'searchAccount',
    'click .search_group'           : 'searchOrganization',
    'click .search_source'          : 'searchSource',
    'click .change_publish_at'      : 'editPublishAt',
    'click .troubleshoot'           : 'openTroubleshooting',
    'click .contact_us'             : 'openContactUs',
    'click .open_pages'             : 'openPagesInViewer',
    'click .show_mentions'          : 'fetchAllMentions',
    'click .page_list .left'        : 'previousPage',
    'click .page_list .right'       : 'nextPage',
    'click .data_item'              : 'searchData'
  },

  // Takes a document model and sets up listeners on the document model,
  // its notes, and pageEntities.
  constructor : function(options) {
    Backbone.View.call(this, options);
    this.el.id = 'document_' + this.model.id;
    this._currentPage = 0;
    this._showingPages = false;
    this.setMode(this.model.get('annotation_count') ? 'owns' : 'no', 'notes');
    _.bindAll(this, '_onDocumentChange', '_onDrop', '_addNote', '_renderNotes',
      '_renderPages', '_renderEntities', '_setSelected', 'viewDocuments',
      'viewPublishedDocuments', 'openDialog', 'setAccessLevelAll', 'viewEntities',
      'hideNotes', 'viewPages', 'viewChosenPages', 'deleteDocuments',
      'removeFromProject', '_openShareDialog', 'openDataDialog', 'focus');
    this.model.bind('change', this._onDocumentChange);
    this.model.bind('change:selected', this._setSelected);
    this.model.bind('focus', this.focus);
    this.model.bind('view:pages', this.viewPages);
    this.model.bind('notes:hide', this.hideNotes);
    this.model.notes.bind('add', this._addNote);
    this.model.notes.bind('reset', this._renderNotes);
    this.model.entities.bind('load', this._renderEntities);
    this.model.pageEntities.bind('reset', this._renderPages);
  },

  // Render the document tile, setting modes, selected state, and attaches drag events.
  render : function(options) {
    options || (options = {});
    var me = this;
    var title = this.model.get('title');
    var data = _.extend(this.model.toJSON(), {
      model         : this.model,
      created_at    : this.model.get('created_at').replace(/\s/g, '&nbsp;'),
      icon          : this._iconAttributes(),
      thumbnail_url : this._thumbnailURL(),
      data          : this.model.sortedData()
    });
    if (dc.app.paginator && dc.app.paginator.mini) data.title = dc.inflector.truncateWords(data.title, 50);
    $(this.el).html(JST['document/tile'](data));
    this._displayDescription();
    if (dc.account) this.$('.doc.icon').draggable({ghost : true, onDrop : this._onDrop});
    this.notesEl = this.$('.notes');
    this.entitiesEl = this.$('.entities');
    this.pagesEl = this.$('.pages');
    this.entitiesView = new dc.ui.SparkEntities({model: this.model, parent: this, container: this.$('.entities')});
    this.model.notes.each(function(note){ me._addNote(note); });
    if (options.notes && this.model.hasLoadedNotes()) this.setMode('has', 'notes');
    this.setMode(dc.access.NAMES[this.model.get('access')], 'access');
    this.setMode(this.model.allowedToEdit() ? 'is' : 'not', 'editable');
    this._setSelected();
    return this;
  },

  // Desktop-style selection.
  select : function(e) {
    e.preventDefault();
    if (!this.model.get('selectable')) return;
    var alreadySelected =  this.model.get('selected');
    var hk = dc.app.hotkeys;
    var anchor = Documents.firstSelection || Documents.selected()[0];
    if (hk.command || hk.control) {
      // Toggle.
      this.model.set({selected : !alreadySelected});
    } else if (hk.shift && anchor) {
      // Range.
      var idx = Documents.indexOf(this.model), aidx = Documents.indexOf(anchor);
      var start = Math.min(idx, aidx), end = Math.max(idx, aidx);
      Documents.each(function(doc, index) {
        doc.set({selected : index >= start && index <= end});
      });
    } else {
      // Regular.
      Documents.deselectAll();
      this.model.set({selected : true});
    }
  },

  // If the document is published, open the remote url, otherwise open
  // the local DocumentCloud viewer.
  viewDocument : function(e) {
    this.model.openAppropriateVersion();
    return false;
  },

  // Opens the remote document viewer.
  viewPublishedDocuments : function() {
    var docs = Documents.chosen(this.model);
    if (!docs.length) return;
    _.each(docs, function(doc){
      if (doc.isPublished()) doc.openPublishedViewer();
    });
  },

  // Opens the local document viewer.
  viewDocuments : function() {
    var docs = Documents.chosen(this.model);
    if (!docs.length) return;
    _.each(docs, function(doc){ doc.openViewer(); });
  },

  viewPDF : function() {
    this.model.openPDF();
  },

  viewFullText : function() {
    this.model.openText();
  },

  // Old implementation of viewEntities:
  // dc.app.searcher.viewEntities(Documents.chosen(this.model));

  viewEntities : function() {
    var docs = Documents.chosen(this.model);
    dc.app.paginator.ensureRows(function(){
      dc.model.EntitySet.populateDocuments(docs);
    }, docs[0]);
  },

  hideNotes : function() {
    this.setMode(this.model.hasNotes() ? 'owns' : 'no', 'notes');
  },

  downloadViewer : function() {
    if (this.checkBusy()) return;
    this.model.downloadViewer();
  },

  // Open an edit dialog for this document.
  openDialog : function(e) {
    if (!(this.modes.editable == 'is')) return;
    if (this.model.checkBusy()) return;
    dc.ui.DocumentDialog.open(this.model);
  },

  // Open a dialog to edit the document's data.
  openDataDialog : function(e) {
    if (!(this.modes.editable == 'is')) return;
    if (this.model.checkBusy()) return;
    dc.ui.DocumentDataDialog.open(this.model);
  },

  openPagesInViewer : function() {
    this.model.openViewer('#pages');
  },

  fetchAllMentions : function() {
    this.model.fetchMentions(dc.app.searchBox.value());
  },

  previousPage : function() {
    this._currentPage--;
    this.viewPages();
  },

  nextPage : function() {
    this._currentPage++;
    this.viewPages();
  },

  // Show the notes attached to the document model. Requires a server fetch.
  toggleNotes : function(e) {
    e.stopPropagation();
    var next = _.bind(function() {
      var model = Documents.get(this.model.id);
      if (this.modes.notes == 'has') return this.setMode('owns', 'notes');
      if (model.checkBusy()) return;
      if (model.hasLoadedNotes()) {
        this._renderNotes();
        return this.setMode('has', 'notes');
      }
      dc.ui.spinner.show('loading notes');
      model.notes.fetch({
        reset: true,
        success : function() {
          dc.ui.spinner.hide();
          window.scroll(0, $('#document_' + model.id).offset().top - 100);
      }});
    }, this);
    dc.app.paginator.mini ? dc.app.paginator.toggleSize(next, this.model) : next();
  },

  // Show thumbnails of the pages in the document. Paged using `this._currentPage`.
  viewPages : function() {
    this._showingPages = true;
    this.model.ensurePerPageNoteCounts(_.bind(function(noteCounts) {
      var start = (this._currentPage * this.PAGE_LIMIT) + 1;
      var total = this.model.get('page_count');
      this.pagesEl.html(JST['document/page_images']({
        doc     : this.model,
        start   : start,
        end     : Math.min(start + this.PAGE_LIMIT - 1, total),
        total   : total,
        limit   : this.PAGE_LIMIT,
        notes   : noteCounts
      }));
    }, this));
  },

  // Document context menu item which triggers the `view:pages` event on each selected
  // document. This will call `viewPages`, which displays page thumbnails below
  // the document tile.
  viewChosenPages : function() {
    var docs = Documents.chosen(this.model);
    dc.app.paginator.ensureRows(function() {
      _.each(docs, function(doc){
        if (doc = Documents.get(doc.id)) doc.trigger('view:pages');
      });
    }, docs[0]);
  },

  // Document context menu item used to delete multiple selected documents.
  deleteDocuments : function() {
    Documents.verifyDestroy(Documents.chosen(this.model));
  },

  // Document context menu item used to modify multiple selected documents.
  removeFromProject : function() {
    Projects.firstSelected().removeDocuments(Documents.chosen(this.model));
  },

  // Clicking on the contributor's name in the document tile searches for other
  // documents by this account.
  searchAccount : function() {
    dc.app.searcher.addToSearch(_.t('account'), this.model.get('account_slug'));
  },

  // Clicking on the organization's name in the document tile searches for other
  // documents contributed by this organization.
  searchOrganization : function() {
    dc.app.searcher.addToSearch(_.t('group'), this.model.get('organization_slug'));
  },

  // Clicking on the source in the document tile searches for other documents
  // from this source.
  searchSource : function() {
    dc.app.searcher.addToSearch(_.t('source'), this.model.get('source').replace(/"/g, '\\"'));
  },

  searchData : function(e) {
    var el    = $(e.currentTarget);
    var key   = el.find('.data_key').text().replace(/:$/, '');
    var value = el.find('.data_value').text();
    dc.app.searcher.toggleSearch(key, value);
  },

  // Context menu item opens access level dialog for a single document.
  editAccessLevel : function() {
    Documents.editAccess([this.model]);
  },

  // Context menu item opens access level dialog for multiple selected documents.
  setAccessLevelAll : function() {
    Documents.editAccess(Documents.chosen(this.model));
  },

  // Opens dialog to change `publish_at` field on document model.
  editPublishAt : function() {
    new dc.ui.PublicationDateDialog([this.model]);
  },

  // Focus by jumping to the top of the view.
  focus : function() {
    window.scroll(0, $(this.el).offset().top - 100);
  },

  // Documents that have failed processing show a link to this help page.
  openTroubleshooting : function() {
    dc.app.workspace.help.openPage('troubleshooting');
  },

  // Documents that have failed processing show a link to this contact dialog.
  openContactUs : function() {
    dc.ui.Dialog.contact();
  },

  // Opens the Document Reviewers dialog for a single document.
  _openShareDialog : function() {
    dc.app.shareDialog = new dc.ui.ShareDialog({
      docs: [this.model],
      mode: 'custom'
    });
  },

  // Shows the context menu for the document tile. Multiple documents can be selected
  // and have the context menu items apply to them.
  showMenu : function(e) {
    e.preventDefault();
    var menu = dc.ui.Document.sharedMenu || (dc.ui.Document.sharedMenu = new dc.ui.Menu({
      id : 'document_menu',
      standalone : true
    }));
    var count = Documents.chosen(this.model).length;
    if (!count) return;

    menu.clear();
    var items = [{title : _.t('open'), onClick: this.viewDocuments}];
    if (this.model.isPublished()) {
      items.push({
        title   : _.t('open_published_version'),
        onClick : this.viewPublishedDocuments
      });
    }
    items.push({title : _.t('view_entities'), onClick: this.viewEntities});
    items.push({title : _.t('view_pages'), onClick: this.viewChosenPages});
    if (this.model.allowedToEdit()) {
      items = items.concat([
        {title : _.t('edit_document_information'), onClick: this.openDialog},
        {title : _.t('edit_document_data'),        onClick: this.openDataDialog},
        {title : _.t('set_access'),                onClick: this.setAccessLevelAll},
        {title : _.t('delete_documents', count),    onClick: this.deleteDocuments,
                                              attrs : {'class' : 'warn'}}
      ]);
    }
    if (Projects.firstSelected()) {
      var index = items.length - (items[items.length - 1].onClick == this.deleteDocuments ? 1 : 0);
      items.splice(index, 0, {title : _.t('remove_from_project'), onClick: this.removeFromProject});
    }
    menu.addItems(items);
    menu.render().open().content.css({top : e.pageY, left : e.pageX});
  },

  // Helper method for setting which action icons appear next to the document tile.
  _iconAttributes : function() {
    var access = this.model.get('access');
    var base = 'icon main_icon document_tool ';
    switch (access) {
      case dc.access.PENDING:
        return {'class' : base + 'spinner',    title : _.t('uploading') + ' ...' };
      case dc.access.ERROR:
        return {'class' : base + 'alert_gray', title : _.t('broken_document') };
      case dc.access.ORGANIZATION:
        return {'class' : base + 'lock',       title : _.t('private_to', (dc.account ?
                                                       dc.account.organization().get('name') :
                                                       'your organization') )};
      case dc.access.PRIVATE:
        return {'class' : base + 'lock',       title : _.t('private')};
      default:
        if (this.model.isPublished())
          return {'class' : base + 'published', title : _.t('open_published') };
        return {'class' : base + 'hidden', iconless: true};
    }
  },

  // Helper method for getting the right document tile icon URL, based on
  // failure status of the document model.
  _thumbnailURL : function() {
    var access = this.model.get('access');
    switch (access) {
      case dc.access.PENDING: return '/images/embed/documents/processing.png';
      case dc.access.ERROR:   return '/images/embed/documents/failed.png';
      default:                return this.model.get('thumbnail_url');
    }
  },

  // HTML descriptions need to be sanitized for the workspace.
  _displayDescription : function() {
    var el = this.$('.description_text');
    if (this.model.get('access') == dc.access.ERROR) return el.html(this.ERROR_MESSAGE);
    el.text(dc.inflector.stripTags(this.model.get('description') || ''));
  },

  // Trigger-based method which shows selection highlight on document tile.
  _setSelected : function() {
    var sel = this.model.get('selected');
    this.setMode(sel ? 'is' : 'not', 'selected');
  },

  // Trigger-based method which re-renders the tile if any properties on the model
  // have changed.
  _onDocumentChange : function() {
    if (this.model.hasChanged('selected')) return;
    this.render();
  },

  // Render each of a document's notes, which have already been fetched.
  _addNote : function(note) {
    var noteView = new dc.ui.Note({
      model : note,
      collection : this.model.notes
    });
    this.notesEl.append(noteView.render().el);
    noteView.center();
  },

  // Re-renders the notes when the notes are refreshed.
  _renderNotes : function() {
    this.notesEl.empty();
    this.model.notes.each(this._addNote);
    this.setMode(this.model.ignoreNotes ? 'owns' : 'has', 'notes');
  },

  // Re-renders the entities when the entities are refreshed.
  _renderEntities : function() {
    if (this.model.entities.length) {
      this.entitiesView.show();
    } else {
      dc.ui.Dialog.alert( _.t('has_no_entities', this.model.get('title') ) );
    }
  },

  // Clicking on the page counts in the tile opens up the page thumbnails below
  // the document tile.
  _togglePageImages : function() {
    if (this._showingPages) {
      this._hidePages();
    } else {
      this.viewPages();
    }
  },

  // Clicking on entities shows which pages they are found on, and jumps to this
  // view.
  _renderPages : function() {
    this._showingPages = false;
    this.pagesEl.html(JST['document/pages']({doc : this.model}));
    this.focus();
  },

  // Hiding the entity search locations.
  _hidePages : function() {
    this._showingPages = false;
    this._currentPage = 0;
    this.pagesEl.html('');
  },

  // Clicking on either a page thumbnail or an entity in the document tile opens
  // up the document viewer, set to that page or entity.
  _openPage : function(e) {
    var el   = $(e.target).closest('.page');
    var page = el.attr('data-page');
    var id   = el.attr('data-id');
    if (el.hasClass('mention')) {
      var text = el.find('b').text();
      this.model.openViewer('#search/p' + page + '/' + encodeURIComponent(text));
    } else if (id) {
      this.model.openEntity(id, el.attr('data-offset'));
    } else {
      this.model.openViewer('#document/p' + page);
    }
  },

  // When the document is dropped onto a project, add it to the project.
  _onDrop : function(e) {
    var docs = [this.model];
    var selected = Documents.selected();
    if (selected.length && _.include(selected, this.model)) docs = selected;
    var x = e.pageX, y = e.pageY;
    $('#organizer .project').each(function() {
      var top = $(this).offset().top, left = $(this).offset().left;
      var right = left + $(this).outerWidth(), bottom = top + $(this).outerHeight();
      if (left < x && right > x && top < y && bottom > y) {
        var project = Projects.get($(this).attr('data-project-cid'));
        if (project) project.addDocuments(docs);
        return false;
      }
    });
  }

});
