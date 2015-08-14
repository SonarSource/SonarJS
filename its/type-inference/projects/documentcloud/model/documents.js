// The Document model contains a few sub-models, as well as all the helper
// methods for dealing with documents.
dc.model.Document = Backbone.Model.extend({

  // Takes a canonical document representation and creates necessary
  // sub-models.
  constructor : function(attrs, options) {
    attrs.selected = false;
    attrs.selectable = true;
    if (attrs.annotation_count == null) attrs.annotation_count = 0;
    Backbone.Model.call(this, attrs, options);
    var id = this.id;
    this.notes = new dc.model.NoteSet();
    this.notes.url = function() {
      return '/documents/' + id + '/annotations';
    };
    this.entities = new dc.model.EntitySet();
    if (this.get('annotations')) this.notes.reset(this.get('annotations'));
    this.pageEntities = new dc.model.EntitySet();
    this.reviewers = new dc.model.AccountSet();
  },

  // If this document does not belong to a collection, it still has a URL.
  url : function() {
    if (!this.collection) return '/documents/' + this.id;
    return Backbone.Model.prototype.url.call(this);
  },

  // Generate the canonical URL for opening this document, over SSL if we're
  // currently secured.
  viewerUrl : function() {
    var base = this.get('document_viewer_url').replace(/^https?:/, '');
    return window.location.protocol + base;
  },

  // Generate the published URL for opening this document.
  publishedUrl : function() {
    return this.get('remote_url') || this.get('detected_remote_url');
  },

  // Even if we're in the SSL-only workspace, generate the HTTP version of an
  // AWS resource link.
  publicUrl : function(url) {
    if (url.indexOf('s3.documentcloud.org') < 0) return url;
    return url.replace('s://s3.amazonaws.com/', '://');
  },

  // Generate the canonical id for this document.
  canonicalId : function() {
    return this.id + '-' + this.get('slug');
  },

  // Ex: Mar 11, 2011
  formatDay : DateUtils.create('%b %e, %Y'),

  // Ex: 7:14 PM
  formatTime : DateUtils.create('%l:%M %P'),

  // Generate the date object for this Document's `publish_at`.
  publishAtDate : function() {
    var date = this.get('publish_at');
    return date && DateUtils.parseRfc(date);
  },

  // Standard display of `publish_at`.
  formattedPublishAtDate : function() {
    var date = this.publishAtDate();
    return date && (this.formatDay(date) + ' at ' + this.formatTime(date));
  },

  // Merge in and save a hash of data, removing any blank keys or values.
  mergeData : function(hash, toRemove) {
    var data = this.get('data');
    _.each(toRemove, function(key){ delete data[key]; });
    _.each(hash, function(val, key) {
      val ? data[key] = val : delete data[key];
    });
    this.save({data: data});
    this.trigger('change', this);
  },

  // Return the sorted array of key value pairs for the document's data.
  sortedData : function() {
    return Documents.sortData(this.get('data'));
  },

  // Does the document have any notes?
  hasNotes : function() {
    return !!this.get('annotation_count');
  },

  // Does the document have notes, *and* are they already loaded?
  hasLoadedNotes : function() {
    return this.notes.length && this.notes.length == this.get('annotation_count');
  },

  // Fetch all of the documents page mentions for a given search query.
  fetchMentions : function(query) {
    $.getJSON(this.url() + '/mentions', {q: query}, _.bind(function(resp) {
      this.set(resp);
    }, this));
  },

  // Tell the server to reprocess the text for this document.
  reprocessText : function(forceOCR) {
    var params = {};
    if (forceOCR) params.ocr = true;
    $.ajax({url : this.url() + '/reprocess_text', data: params, type : 'POST', dataType : 'json', success : _.bind(function(resp) {
      this.set({access : dc.access.PENDING});
    }, this)});
  },

  openViewer : function(suffix) {
    if (this.checkBusy()) return;
    return window.open(this.viewerUrl() + (suffix || ''));
  },

  openEntity : function(id, offset) {
    window.open(this.viewerUrl() + "?entity=" + id + '&offset=' + offset);
  },

  openPublishedViewer : function() {
    if (this.checkBusy()) return;
    if (!this.isPublished()) return dc.ui.Dialog.alert( _.t('x_is_not_published', this.get('title') ) );
    return window.open(this.publishedUrl());
  },

  // Open the published version, if we're not logged in and the document is
  // published. Otherwise, open the in-workspace version.
  openAppropriateVersion : function(suffix) {
    return (!dc.account && this.isPublished()) ?
      this.openPublishedViewer() : this.openViewer(suffix);
  },

  openText : function() {
    if (this.checkBusy()) return;
    window.open(this.get('full_text_url'));
  },

  openPDF : function() {
    if (this.checkBusy()) return;
    window.open(this.get('pdf_url'));
  },

  pageThumbnailURL : function(page, size) {
    size || (size = 'thumbnail');
    return this.get('page_image_url').replace('{size}', size).replace('{page}', page);
  },

  allowedToEdit : function() {
    if (this.viewerEditable) return true;
    var current = Accounts.current();
    return current && Accounts.current().allowedToEdit(this);
  },

  // Is the document editable by the current account?
  checkAllowedToEdit : function(message) {
    message = message || _.t('no_permission_to_edit_x', this.get('title') );
    if (this.allowedToEdit()) return true;
    dc.ui.Dialog.alert(message);
    return false;
  },

  checkBusy : function() {
    if (!(this.get('access') == dc.access.PENDING)) return false;
    dc.ui.Dialog.alert( _.t('x_still_processing', this.get('title') ) );
    return true;
  },

  uniquePageEntityValues : function() {
    return _.uniq(this.pageEntities.map(function(m){ return m.get('value'); }));
  },

  isPending : function() {
    return this.get('access') == dc.access.PENDING;
  },

  isPublic : function() {
    return this.get('access') == dc.access.PUBLIC;
  },

  isPublished : function() {
    return this.isPublic() && this.publishedUrl();
  },

  ensurePerPageNoteCounts : function(callback) {
    if (this.perPageNoteCounts) {
      callback(this.perPageNoteCounts);
    } else {
      $.getJSON('/documents/' + this.id + '/per_page_note_counts', {}, _.bind(function(counts){
        callback(this.perPageNoteCounts = counts);
      }, this));
    }
  },

  decrementNotes : function() {
    var count = this.get('annotation_count');
    if (count <= 0) return false;
    this.set({annotation_count : count - 1});
  },

  removePages : function(pages) {
    Documents.removePages(this, pages);
  },

  reorderPages : function(pageOrder) {
    Documents.reorderPages(this, pageOrder);
  },

  // Inspect.
  toString : function() {
    return 'Document ' + this.id + ' "' + this.get('title') + '"';
  }

});


// Document Set

dc.model.DocumentSet = Backbone.Collection.extend({

  model    : dc.model.Document,

  EMBED_FORBIDDEN : _.t('no_embed_permission'),

  POLL_INTERVAL : 10 * 1000, // 10 seconds.

  // Default number of mentions to include in a text search.
  NUM_MENTIONS : 3,

  url : '/documents',

  constructor : function(options) {
    Backbone.Collection.call(this, options);
    this._polling = false;
    _.bindAll(this, 'poll', 'downloadViewers', 'downloadSelectedPDF', 'downloadSelectedFullText', 'printNotes', '_onModelChanged');
    this.bind('change', this._onModelChanged);
  },

  comparator : function(doc) {
    return doc.get('index');
  },

  pending : function() {
    return this.select(function(doc){ return doc.isPending(); });
  },

  subtitle : function(count) {
    return _.t('x_documents',count);
  },

  // Given a list of documents and an attribute, return the value of the
  // attribute if identical, or null if divergent.
  sharedAttribute : function(docs, attr) {
    var attrs = _.uniq(_.map(docs, function(doc){ return doc.get(attr); }));
    return attrs.length > 1 ? false : attrs[0];
  },

  // Given a list of documents, return the sorted list of data key/value
  // pairs they have in common.
  sharedData : function(docs) {
    docs = _.clone(docs);
    var first  = docs.shift();
    var shared = _.clone(first.get('data'));
    _.each(docs, function(doc) {
      for (var key in shared) {
        if (doc.attributes.data[key] !== shared[key]) delete shared[key];
      }
    });
    return shared;
  },

  // Convert a data hash into a sorted list of pairs.
  sortData : function(data) {
    var list = [];
    for (var key in data) {
      list.push([key, data[key]]);
    }
    return list.sort(function(a, b){ return a[0] > b[0] ? 1 : -1; });
  },

  selectedPublicCount : function() {
    return _.reduce(this.selected(), function(memo, doc){
      return memo + doc.isPublic() ? 1 : 0;
    }, 0);
  },

  allowedToEdit : function(docs, message) {
    return !_.any(docs, function(doc) { return !doc.checkAllowedToEdit(message); });
  },

  // Given a clicked document, and the current selected set, determine which
  // documents are chosen.
  chosen : function(doc) {
    var docs = this.selected();
    docs = !doc || _.include(docs, doc) ? docs : [doc];
    if (_.any(docs, function(doc){ return doc.checkBusy(); })) return [];
    return docs;
  },

  // Compute the query needed to embed a given set of documents.
  // If the query is longer than 255 characters, an empty string is returned
  searchEmbedQuery:  function(docs){
    var query = _.map(docs, function(doc){ return 'document: ' + doc.id; }).join(' ');
    return query.length > 255 ? "" : query;
  },

  downloadViewers : function(docs) {
    var ids = _.map(docs, function(doc){ return doc.id; });
    var dialog = dc.ui.Dialog.progress( _.t('downloading_progress', ids.length, docs[0].get('title') ) );
    dc.app.download('/download/' + ids.join('/') + '/document_viewer.zip', function() {
      dialog.close();
    });
  },

  downloadSelectedPDF : function() {
    if (this.selectedCount <= 1) return this.selected()[0].openPDF();
    dc.app.download('/download/' + this.selectedIds().join('/') + '/original_documents.zip');
  },

  downloadSelectedFullText : function() {
    if (this.selectedCount <= 1) return this.selected()[0].openText();
    dc.app.download('/download/' + this.selectedIds().join('/') + '/document_text.zip');
  },

  printNotes : function() {
    var docs = this.selected();
    if (!_.any(docs, function(doc){ return doc.hasNotes(); })) {
      return dc.ui.Dialog.alert( _.t('print_notes_missing_error', '"'+docs[0].get('title')+'"' ) );
    }
    var params = _.map(docs, function(doc){ return 'docs[]=' + doc.id; }).join('&');
    var win = window.open(SERVER_ROOT + '/notes/print?' + params);
  },

  startPolling : function() {
    this._polling = setInterval(this.poll, this.POLL_INTERVAL);
  },

  stopPolling : function() {
    clearInterval(this._polling);
    this._polling = null;
  },

  // Every time we poll, ask for the status of the two oldest documents, plus
  // one random one, if there are more than 5 pending documents.
  poll : function() {
    var ids = _.compact(_.pluck(this.pending(), 'id'));
    if (!ids.length) return this.stopPolling();
    if (ids.length > 5) {
      ids = [ids.shift(), ids.shift(), ids[Math.floor(Math.random() * ids.length)]];
    }
    $.get('/documents/status.json', {'ids[]' : ids}, _.bind(function(resp) {
      _.each(resp.documents, function(json) {
        var doc = Documents.get(json.id);
        if (doc && doc.get('access') != json.access) doc.set(json);
      });
      if (!this.pending().length) this.stopPolling();
    }, this), 'json');
  },

  // Destroy the currently selected documents, after asking for confirmation.
  verifyDestroy : function(docs) {
    if (!this.allowedToEdit(docs)) return;
    var message = _.t('really_delete_x_docs', docs.length );
    dc.ui.Dialog.confirm(message, _.bind(function() {
      var counter = docs.length;
      var progress = dc.ui.Dialog.progress( _.t('deleting_documents') );
      _(docs).each(function(doc){ doc.destroy({success : function() {
        if (!--counter) progress.close();
      }}); });
      Projects.removeDocuments(docs);
      return true;
    }, this));
  },

  // Removes an array of pages from a document. Forces a reprocessing of
  // the entire document, which can be expensive.
  removePages : function(model, pages, options) {
    options = options || {};

    $.ajax({
      url       : '/' + this.resource + '/' + model.id + '/remove_pages',
      type      : 'POST',
      data      : { pages : pages },
      dataType  : 'json',
      success   : function(resp) {
        model.set(resp);
        if (options.success) options.success(model, resp);
      },
      error     : _.bind(function(resp) {
        this._handleError(model, options.error, null, resp);
      }, this)
    });
  },

  // Reorders an array of pages from a document. Forces a reprocessing of
  // the entire document, which can be expensive.
  reorderPages : function(model, pageOrder, options) {
    options = options || {};

    $.ajax({
      url       : '/' + this.resource + '/' + model.id + '/reorder_pages',
      type      : 'POST',
      data      : { page_order : pageOrder },
      dataType  : 'json',
      success   : function(resp) {
        model.set(resp);
        if (options.success) options.success(model, resp);
      },
      error     : _.bind(function(resp) {
        this._handleError(model, options.error, null, resp);
      }, this)
    });
  },

  editAccess : function(docs, callback) {
    var options = {information: this.subtitle(docs.length)};
    if (!this.allowedToEdit(docs)) return;
    var current = this.sharedAttribute(docs, 'access') || dc.access.PRIVATE;
    dc.ui.Dialog.choose( _.t('access_level'), [
      {
        text        : _.t('public_access'),
        description : _.t('public_access_help'),
        value       : dc.access.PUBLIC,
        selected    : current == dc.access.PUBLIC
      },
      {
        text        : _.t('private_access'),
        description : _.t('private_access_help'),
        value       : dc.access.PRIVATE,
        selected    : current == dc.access.PRIVATE
      },
      {
        text        : _.t('private_to', dc.account.organization().get('name') ),
        description : _.t('private_to_organization_help'),
        value       : dc.access.ORGANIZATION,
        selected    : current == dc.access.ORGANIZATION
      }
    ], function(access) {
      _.each(docs, function(doc) { doc.save({access : parseInt(access, 10)}); });
      var notification = _.t('document_access_updated', docs.length );
      if (!_.any(docs, function(doc) { return doc.suppressNotifier; })) {
        dc.ui.notifier.show({mode : 'info', text : notification});
      }
      if (callback) callback(access);
      return true;
    }, options);
  },

  // We override `add` to listen for uploading documents, and to start polling
  // for changes.
  add : function(model, options) {
    Backbone.Collection.prototype.add.call(this, model, options);
    this._checkForPending();
  },

  // We override `reset` to cancel the polling action if the current set
  // has no pending documents.
  reset: function(models, options) {
    this._resetSelection();
    if (!this.pending().length) this.stopPolling();
    Backbone.Collection.prototype.reset.call(this, models, options);
  },

  // When one of our models has changed, if it has changed its access level
  // to pending, start polling.
  _onModelChanged : function(doc) {
    if (doc.hasChanged('access') && doc.isPending()) this._checkForPending();
  },

  _checkForPending : function() {
    if (this._polling) return false;
    if (!this.pending().length) return false;
    this.startPolling();
  }

}, {

  entitle : function(query) {
    var searchQuery = dc.app.visualSearch.searchQuery;
    var title, ret, account, org;

    if (searchQuery.count('project') == 1) {
      title = searchQuery.find('project');
    } else if (dc.account && searchQuery.find('account') == Accounts.current().get('slug')) {
      ret = (searchQuery.find('filter') == 'published') ? 'your_published_documents' : 'your_documents';
    } else if (account = Accounts.getBySlug(searchQuery.find('account'))) {
      title = account.documentsTitle();
    } else if (searchQuery.has('group') && (org = Organizations.findBySlug(searchQuery.find('group')))) {
      title = _.t('organizations_documents', org.get('name') );
    } else if (searchQuery.find('filter') == 'published') {
      ret = 'published_documents';
    } else if (searchQuery.find('filter') == 'popular') {
      ret = 'popular_documents';
    } else if (searchQuery.find('filter') == 'annotated') {
      ret = 'annotated_documents';
    } else {
      ret = 'all_documents';
    }

    return title || dc.model.Project.topLevelTitle(ret);
  }

});

_.extend(dc.model.DocumentSet.prototype, dc.model.Selectable);

// The main set of Documents.
window.Documents = new dc.model.DocumentSet();
