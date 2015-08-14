// An UploadDocument is an in-progress file upload, currently waiting in the queue.
dc.model.UploadDocument = Backbone.Model.extend({

  FILE_EXTENSION_MATCHER : /\.([^.]+)$/,

  MAX_FILE_SIZE : 419430400, // 400 Megabytes

  // State can be one of "pending", "uploading", "error", or "success"
  // It starts out as "pending"
  defaults: {
    state: 'pending'
  },

  // When creating an UploadDocument, we pull off some properties that
  // are on the file object, and attach them as attributes.
  set : function(attrs) {
    var file = attrs.file;
    if (file) {
      var fileName    = file.fileName || file.name;
      fileName        = fileName.match(/[^\/\\]+$/)[0]; // C:\fakepath\yatta yatta.pdf => yatta yatta.pdf
      attrs.title     = dc.inflector.titleize(fileName.replace(this.FILE_EXTENSION_MATCHER, ''));
      var extMatch    = fileName.match(this.FILE_EXTENSION_MATCHER);
      attrs.extension = extMatch && extMatch[1];
      attrs.size      = file.fileSize || file.size || null;
    }
    Backbone.Model.prototype.set.call(this, attrs);
    return this;
  },
  // begin uploading the file.  Submits the data
  // and then sets state to be "uploading"
  beginUpload: function(uploadData){
    var data = this.get('data');
    data.formData = uploadData;
    data.submit();
    this.set({ state: "uploading"});
  },
  recordError: function(errorMessage){
    // if the upload was interrupted, no error message is returned
    if (!errorMessage){
      errorMessage = _.t('upload_failed');
    }
    this.set({error: errorMessage, state: 'error'});
  },
  overSizeLimit : function() {
    return this.get('size') >= this.MAX_FILE_SIZE;
  },
  // aborts the file upload if it still in progress
  abort: function(){
    var upload = this.get('data');
    if ( upload && 'pending' == upload.state() ){
      upload.abort();
    }
  }

});

// The set of UploadDocuments is ordered by the position in which they were added.
dc.model.UploadDocumentSet = Backbone.Collection.extend({

  model : dc.model.UploadDocument,

  comparator : function(model) {
    return model.get('position');
  },

  // returns an a object with success, error, and allComplete keys
  // success and error are arrays that contain the files with the status
  // allComplete indicates whether all files have completed
  completed: function(){
    var uploaded = { success: [], error: [], allComplete: true };
    this.each(function(upload){
      if (upload.get('state') == 'success'){
        uploaded.success.push(upload);
      } else if (upload.get('state') == 'error'){
        uploaded.error.push(upload);
      } else {
        uploaded.allComplete = false;
      }
    });
    return uploaded;
  }

});

window.UploadDocuments = new dc.model.UploadDocumentSet();
