// The UploadDialog handles bulk upload via the HTML5 jQuery file upload plugin.
dc.ui.UploadDialog = dc.ui.Dialog.extend({

  id        : 'upload_dialog',
  className : 'dialog',

  INSERT_PAGES_MESSAGE: _.t('insert_pages_message'),

  // Sets up the uploader only when the Documents tab is opened. Manually use `setupUpload`.
  constructor : function(options) {
    var defaults = {
      editable        : true,
      insertPages     : false,
      autostart       : false,
      collection      : UploadDocuments,
      mode            : 'custom',
      title           : _.t('upload_document'),
      saveText        : _.t('upload'),
      closeText       : _.t('cancel'),
      multiFileUpload : false
    };
    options = _.extend({}, defaults, options);

    _.bindAll(this, 'setupUpload','_onSelect', '_onFailure',
                    '_onProgress', '_onComplete', '_onAllSuccess');

    dc.ui.Dialog.call(this, options);
    if (options.autostart) $(this.el).addClass('autostart');
    if (dc.app.navigation) {
      dc.app.navigation.bind('tab:documents', _.bind(function(){ _.defer(this.setupUpload); }, this));
    }
    this.listenTo(this.collection,'add remove', this._countDocuments);

  },

  // Documents are already selected and are being drawn in the dialog.
  render : function() {
    this.options.multiFileUpload = window.FileList &&
                                   ($("input[type=file]")[0].files instanceof FileList);
    this._tiles = {};
    this._project = _.first(Projects.selected());
    var data = {};
    if (this._project) {
      var title = dc.inflector.truncate(this._project.get('title'), 35);
      data.information = 'Project: ' + title;
    }
    dc.ui.Dialog.prototype.render.call(this, data);
    this.$('.custom').html(JST['document/upload_dialog']());
    this._list = this.$('.upload_list');
    this._renderDocumentTiles();
    this._countDocuments();
    this.center();

    if (this.collection.findWhere({state: 'uploading'})){
      this.$('.ok').setMode('not', 'enabled');
    } else if (!this.options.autostart){
      this.checkQueueLength() ;
    }

    return this;
  },

  // Each document being uploaded is drawn in a single tile, appended to the dialog's list.
  _renderDocumentTiles : function() {
    var tiles           = this._tiles;

    this.collection.each(function(model) {
      var view = new dc.ui.UploadDocumentTile({
        model           : model,
        editable        : this.options.editable,
        multiFileUpload : this.options.multiFileUpload
      });
      tiles[model.id] = view.render();
    },this);

    var viewEls = _.pluck(_.values(tiles), 'el');
    this._list.append(viewEls);
  },

  // initializes the form with the fileupload library and sets up callbacks
  setupUpload : function() {
    // Be careful to only setup file uploading once, when the "Documents" tab is open.
    if (this.form || (dc.app.navigation && !dc.app.navigation.isOpen('documents'))) return;
    var uploadUrl = '/import/upload_document';
    if (this.options.insertPages) {
      uploadUrl = '/documents/' + this.options.documentId + '/upload_insert_document';
    }
    this.form = $('#new_document_form');
    this.form.fileupload({
      url:               uploadUrl,
      sequentialUploads: true,
      dropZone:          $('body'),
      add               : this._onSelect,
      progress          : this._onProgress,
      fail              : this._onFailure,
      done              : this._onComplete
    });
  },

  // Callback for when a file is added to the queue, before uploading has begun.
  _onSelect : function(e, data){
    if (_.isEmpty(data.files)) return;

    _.each(data.files, function(file,index){
      file.model = this.collection.add({
        id          : dc.inflector.sluggify(file.fileName || file.name),
        data        : data,
        file        : file,
        position    : index
      });
    },this);

    // make sure no files are too large to process.  If they are, don't bother uploading them
    if (this.collection.any(function(file){ return file.overSizeLimit(); })) {
      this.close();
      dc.ui.Dialog.alert(_.t('max_upload_size_warn','<a href="/help/troubleshooting">',"</a>") );
      return;
    }
    this.render();

    if (this.options.autostart){
      this.startUpload();
    }
  },

  // Failure callback, one or more files have failed due to a non-200 HTTP response code.
  _onFailure: function(e, data){
    _.each(data.files, function(file){
      file.model.recordError(data.errorThrown);
    });
    this._updateCompletionStatus();
  },

  // Update the progress bar based on the browser's determination of upload progress.
  _onProgress : function(e, data){
    var percentage = parseInt((data.loaded / data.total) * 100, 10);
    _.each(data.files, function(file,index){
      this._tiles[file.model.get('id')].setProgress(percentage);
    },this);
  },

  // Record completions to the uploaded files,
  // Hide the dialog if all uploads have completed without errors
  _onComplete : function(e, data){
    _.each(data.files, function(file){
      this._markFileComplete(file, data.jqXHR);
    }, this);
    this._updateCompletionStatus();
  },

  // Hides the spinner.
  // Also hides dialog if all files have completed without errors
  _updateCompletionStatus: function(){
    var completed = this.collection.completed();

    // Hide the spinner if all files have completed
    if ( completed.allComplete ){
      this.hideSpinner();

      // call the success handler if there were no errors
      if ( !completed.error.length ){
        this._onAllSuccess();
      }
    } else {
      // files were added to queue while upload was progressing
      // we should start them
      this.startUpload();
    }
  },

  // Marks the file as completed.  Hide the tile if no errors occurred
  _markFileComplete: function(file, xhr){
    var model = file.model,
        tile  = this._tiles[model.id],
        resp;
    try {
      if (xhr.responseJSON){
        resp = xhr.responseJSON;
      } else {
        resp  = xhr.responseText && JSON.parse(xhr.responseText);
      }
    } catch (e) {}

    // If the status is not 200, record errors provided
    // or just the generic failure message
    if (xhr.status != 200){
        if ( resp && resp.errors ) {
          model.recordError( resp.errors );
        } else {
          model.recordError( _.t('upload_failed') );
        }
      // Iframe uploads do not provide a body, so the response will have failed to parse above
      // we should have one if the the file was uploaded via XHR
    } else if (resp){
      if (!this.options.insertPages) {
        Documents.add(new dc.model.Document(resp));
        if (this._project) Projects.incrementCountById(this._project.id);
      } else if (this.options.insertPages) {
        this.documentResponse = resp;
      }
    }

    // record success unless we found an error above
    if ( !model.get('error') ){
      model.set({state: 'success'});
    }
  },

  // Once all files have uploaded successfully, close the upload dialog
  // If the upload was initiated from a document viewer, close the window
  // and alert the user that it was closed so the file can re-process
  _onAllSuccess : function() {
    this.hideSpinner();
    if (this.options.insertPages) {
      try {
        window.opener && window.opener.Documents &&
          window.opener.Documents.get(this.options.documentId).set(this.documentResponse);
      } catch (e) {
        // No parent window...
      }
      dc.ui.Dialog.alert(this.INSERT_PAGES_MESSAGE, {onClose : function() {
        window.close();
        _.defer(dc.ui.Dialog.alert, _.t('close_while_text_reprocess') );
      }});
    }
    this.close();
  },

  // Update title and fields to match the new count of uploads.
  // Called when a file is added or removed from the pending queue
  _countDocuments : function() {
    var num = this.collection.length;
    this.title( _.t('uploaded_x_documents',num) );

    this.$('.upload_public_count').text( _.t('make_documents_public', num ) );
    this.$('.upload_email_count').text( _.t('uploaded_x_document_has', num ) );
  },

  // Ask the server how many work units are currently queued and updates the info block on dialog with results
  // Wraps the implementation with debounce to make sure status is only checked once per second
  checkQueueLength : _.debounce(function() {
    $.getJSON('/documents/queue_length.json', {}, _.bind(function(resp) {
      var num = resp.queue_length;
      if (num <= 0) return;
      this.info( _.t('document_processing_count', num ), true );
    }, this));
  },1000),

  // Used by the ReplacePagesEditor to include the
  //    `insertPagesAt`, `replacePagesStart`, and `replacePagesEnd` options.
  insertPagesAttrs : function(attrs) {
    _.extend(this.options, attrs);
  },

  // Overrides `Dialog#confirm`.  Validates titles and begins uploading by calling `startUpload`
  confirm : function(ev) {
    // Don't start re-uploading if the OK button is disabled
    if ( this.$('.ok').hasClass('not_enabled')) {
      return;
    }
    var failed = _.select(this._tiles, function(tile) { return tile.ensureTitle(); });
    if (failed.length) {
      var num = this.collection.length;
      this.error( _.t('must_have_doc_title', num ) );
      return;
    }
    this.$('.ok').setMode('not', 'enabled');
    this.startUpload();
  },

  // Starts the upload. Triggered by clicking the Submit button.
  startUpload : function() {
    if (!this.collection.length) {
      this.error( _.t('must_upload_something') );
      return false;
    }
    this.collection.each( function(upload){
      if (upload.get('state') == 'pending'){
        upload.beginUpload( this._uploadData(upload) );
      }
    },this);
    return true;
  },

  // Called by `startUpload` immediately before file is uploaded to server,
  // returns the form data that should be included with the request
  _uploadData : function(model){
    var attrs   = this._tiles[model.id].serialize();
    var options = this.options;

    model.set(attrs);
    if (options.multiFileUpload && model.get('size')) attrs.multi_file_upload = true;
    attrs.authenticity_token = $("meta[name='csrf-token']").attr("content");
    if (this.$('#make_public').is(':checked')) attrs.make_public = true;
    attrs.email_me = this.$('#email_on_complete').is(':checked') ? this.collection.length : 0;
    if (this._project) attrs.project = this._project.id;
    if (_.isNumber(options.insertPageAt)) attrs.insert_page_at = options.insertPageAt;
    if (_.isNumber(options.replacePagesStart)) attrs.replace_pages_start = options.replacePagesStart;
    if (_.isNumber(options.replacePagesEnd)) attrs.replace_pages_end = options.replacePagesEnd;
    if (options.documentId)  attrs.document_id     = options.documentId;
    if (options.insertPages) attrs.document_number = model.get('position') + 1;
    if (options.insertPages) attrs.document_count  = this.collection.length;
    if (!options.autostart) this.showSpinner();
    this._list[0].scrollTop = 0;
    return attrs;
  },


  // User-initiated close
  cancel : function() {
    this.close();
  },

  // Closes dialog when finished. Clears out collection for next upload.
  close : function() {
    this.collection.invoke('abort');
    this.collection.reset();
    dc.ui.Dialog.prototype.close.call(this);
  }

});

// Each upload tile is used to represent a single document waiting to be uploaded.
dc.ui.UploadDocumentTile = Backbone.View.extend({

  className : 'row',

  events : {
    'click .remove_queue' : 'removeUploadFile',
    'click .open_edit'    : 'openEdit',
    'click .apply_all'    : 'applyAll'
  },

  initialize: function(options) {
    this.options = options;
    this.listenTo(this.model, 'change:state', this.onStateChange);
  },

  // Renders tile and sets up commonly used jQuery selectors.
  render : function() {
    var template = JST['document/upload_document_tile']({
      editable        : this.options.editable,
      autostart       : this.options.autostart,
      model           : this.model,
      multiFileUpload : this.options.multiFileUpload
    });
    $(this.el).html(template);
    this._title    = this.$('input[name=title]');
    this._progress = this.$('.progress_bar');
    // show the progress bar if we were re-rendered while the upload was in progress.
    if (this.model.get('state') == 'uploading'){
      this.startProgress();
    }
    return this;
  },

  // Serialize user-submitted form data for the document's various attributes.
  serialize : function() {
    return {
      title       : this._title.val(),
      description : this.$('textarea[name=description]').val(),
      source      : this.$('input[name=source]').val(),
      access      : this.$('select[name=access]').val(),
      language    : this.$('select[name=language]').val()
    };
  },

  // Sends abort signal to file upload if it is still in process of uploading
  // The abort signal will be caught by the fileUpload onFailure handler
  removeUploadFile : function() {
    this.model.abort();
    this.model.collection.remove(this.model);
    this.remove();
  },

  // Apply the current file's attributes to all files in the upload.
  applyAll : function() {
    var dialog = dc.app.uploader.el;
    var attrs  = this.serialize();
    $('textarea[name=description]', dialog).val(attrs.description);
    $('input[name=source]',         dialog).val(attrs.source);
    $('select[name=access]',        dialog).val(attrs.access);
    $('select[name=language]',      dialog).val(attrs.language);
    dc.app.uploader.info( _.t('update_applied_all') );
  },

  // Toggle used to show/hide upload document's user-editable attributes.
  openEdit : function() {
    this.$('.upload_edit').toggle();
    this.$('.open_edit').toggleClass('active');
  },

  // Called once the file begins uploading.
  // Zero out the progress bar and hide controls
  startProgress : function() {
    this._percentage = 0;
    if (this.options.multiFileUpload) {
      this._progress.show();
    }
    // hide edit control since it can't be used once upload has began
    this.$('.icon.edit_title').css("visibility", "hidden");
  },

  // Smoothly animate progress bar to browser-supplied level.
  setProgress : function(percentage) {
    if (percentage <= this._percentage) return;
    this._percentage = percentage;
    this._progress.stop(true).animate({width: percentage + '%'}, {queue: false, duration: 400});
  },

  // Validation used by uploader dialog.
  ensureTitle : function() {
    var noTitle = _.isEmpty(dc.inflector.trim(this._title.val()));
    this._title.closest('.text_input').toggleClass('error', noTitle);
    return noTitle;
  },

  // Hide document tile when finished uploading.
  hide : function() {
    $(this.el).animate({opacity: 0}, 200).slideUp(200, function(){ $(this).remove(); });
  },

  // called when the model's state changes.
  // Valid states are: "pending", "uploading", "error", or "success"
  onStateChange: function(model, state){
    if ('error' == state){
      this.onError();
    } else if ('success' == state){
      this.onSuccess();
    } else if ('uploading' == state){
      this.startProgress();
    }
  },

  // Sets the tile to have "error" css class and displays an error message to the right of the title
  onError: function(){
    this._title.closest('.text_input')
      .addClass('error')
      .append('<span class="msg">'+this.model.get('error')+'</span>');
  },

  // hide ourselves once file is complete
  onSuccess: function(){
    // set visiblility vs just calling hide() in order to keep alignment with pending uploads
    this.hide();
  }

});
