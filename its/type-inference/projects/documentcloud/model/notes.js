// Note Model

dc.model.Note = Backbone.Model.extend({

  document : function() {
    return this._document = this._document || Documents.get(this.get('document_id'));
  },

  checkAllowedToEdit : function() {
    if (!dc.account) return false;
    if (this.document().viewerEditable) return true;
    return Accounts.current().allowedToEdit(this);
  },
  
  resourceUrl: function(opts) {
    var options = opts || {};
    var url = this.get('resource_url');
    if (options.agnostic){ url = url.replace(/^\S+:/,''); }
    return url;
  },

  imageUrl : function() {
    return this._imageUrl = this._imageUrl ||
      this.document().get('page_image_url').replace('{size}', 'normal').replace('{page}', this.get('page'));
  },

  coordinates : function() {
    if (this._coordinates) return this._coordinates;
    var loc = this.get('location');
    if (!loc) return null;
    var css = _.map(loc.image.split(','), function(num){ return parseInt(num, 10); });
    return this._coordinates = {
      top:    css[0],
      left:   css[3],
      right:  css[1],
      height: css[2] - css[0],
      width:  css[1] - css[3]
    };
  }

});

// Note Set

dc.model.NoteSet = Backbone.Collection.extend({

  model : dc.model.Note,
  url   : '/notes',

  comparator : function(note) {
    var coords = note.coordinates();
    return note.get('page') * 10000 + (coords ? coords.top : 0);
  },

  unrestricted : function() {
    return this.filter(function(note){ return note.get('access') != 'private'; });
  }

});
