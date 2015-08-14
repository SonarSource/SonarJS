// Entity Model

dc.model.Entity = Backbone.Model.extend({

  // Dimensions for bucketing the occurrences.
  DIMS: {
    height: 19,
    bucket: 3,
    min:    2,
    margin: 1
  },

  initialize : function() {
    this.excerpts = {};
  },

  // Lazily split and cache the serialized occurrences (they won't change).
  occurrences : function() {
    if (!this._occurrences) {
      this._occurrences = _.map(this.get('occurrences').split(','), function(pair) {
        pair = pair.split(':');
        return [parseInt(pair[0], 10), parseInt(pair[1], 10)];
      });
      this.occurrenceCount = this._occurrences.length;
    }
    return this._occurrences;
  },

  // Load the text for a single occurrence of this entity.
  loadExcerpt : function(occurrence, callback) {
    var excerpt;
    if (excerpt = this.excerpts[occurrence]) return callback(excerpt);
    $.get('/documents/occurrence.json', {id: this.id, occurrence: occurrence}, _.bind(function(resp) {
      callback(this.excerpts[occurrence] = resp.excerpts[0]);
    }, this), 'json');
  },

  // Chunk the occurrences of this entity in the document into fixed-size boxes
  buckets : function(width) {
    var doc         = Documents.get(this.get('document_id'));
    var max         = doc.get('char_count');
    var numBuckets  = Math.floor(width / (this.DIMS.bucket + this.DIMS.margin));
    var occurrences = this.occurrences();
    var buckets     = [];
    var maxOcc      = 5; // Even if the overall entity counts are low...

    var location = function(character) {
      return Math.floor(character / (max / numBuckets));
    };

    for (var i = 0, l = occurrences.length; i < l; i++) {
      var occ = occurrences[i];
      var loc = location(occ[0]);
      var bucket = buckets[loc] || (buckets[loc] = {height: 0, offset: 0, length: 0});
      var val = bucket.height += 1;
      if (bucket.length < occ[1]) {
        bucket.offset = occ[0];
        bucket.length = occ[1];
      }
      if (maxOcc < val) maxOcc = val;
    }

    var heightPer = this.DIMS.height / maxOcc;

    for (var i = 0, l = buckets.length; i < l; i++) {
      var bucket = buckets[i];
      if (bucket) {
        // Here we round to the nearest odd integer...
        bucket.height = (Math.round(((heightPer * bucket.height) - 1) / 2) * 2 + 1) + this.DIMS.min;
      }
    }

    return buckets;
  }

}, {

  // Map of kind to display name for titles and the like.
  DISPLAY_NAME : {
    city          : _.t('city'),
    country       : _.t('country'),
    date          : _.t('date'),
    phone         : _.t('phone'),
    email         : _.t('email'),
    organization  : _.t('organization'),
    person        : _.t('person'),
    place         : _.t('place'),
    state         : _.t('state'),
    term          : _.t('term')
  },

  PER_PAGE: 10,

  // When rendering entities in a list, use this order:
  ORDER : ['person', 'organization', 'place', 'term', 'email', 'phone', 'city', 'state', 'country'],

  // Only render these types of entities with a sparkline:
  SPARK_GRAPHS: ['person', 'organization', 'place', 'term'],

  // Fetch a single entity across a set of visible documents.
  fetch : function(kind, value, callback) {
    this._fetch(Documents.pluck('id'), {kind: kind, value: value}, callback);
  },

  // Fetch a single entity for a single document, by id.
  fetchId : function(docId, entityId, callback) {
    this._fetch([docId], {entity_id : entityId}, callback);
  },

  _fetch : function(ids, options, callback) {
    dc.ui.spinner.show();
    var data = _.extend({'ids[]': ids}, options);
    $.get('/documents/entity.json', data, function(resp) {
      callback(_.map(resp.entities, function(obj){ return new dc.model.Entity(obj); }));
      dc.ui.spinner.hide();
    }, 'json');
  }

});

// Entity Set

dc.model.EntitySet = Backbone.Collection.extend({

  model : dc.model.Entity,

  // comparator : function(entity) {
  //   var pages = _.pluck(entity.get('excerpts'), 'page_number');
  //   return Math.min.apply(Math, pages);
  // }

  index : function() {
    if (!this._index) {
      var index = this._index = _.groupBy(this.models, function(e){ return e.attributes.kind; });
      _.each(index, function(list, kind) {
        index[kind] = _.sortBy(list, function(item) {
          return -item.occurrences().length;
        });
      });
    }
    return this._index;
  },

  // Pass a kind to filter, or leave it out for the total sum of all occurrences.
  sumOccurrences : function(kind) {
    this.index();
    var sum = 0, i = this.models.length;
    while (i--) {
      var model = this.models[i];
      if (!kind || model.attributes.kind == kind) {
        sum += model.occurrenceCount;
      }
    }
    return sum;
  }

}, {

  populateDocuments: function(docs) {
    docs = _.compact(_.map(docs, function(doc){ return Documents.get(doc.id); }));
    var callback = function() {
      _.each(docs, function(doc){ doc.entities.trigger('load'); });
    };
    var missing = _.select(docs, function(doc){ return !doc.entities.loaded; });
    if (!missing.length) return callback();
    dc.ui.spinner.show();
    $.get('/documents/entities.json', {'ids[]' : _.pluck(missing, 'id')}, function(resp) {
      var entities = _.groupBy(resp.entities, 'document_id');
      _.each(entities, function(list, docId) {
        var collection = Documents.get(docId).entities;
        collection.loaded = true;
        collection.reset(list);
      });
      dc.ui.spinner.hide();
      callback();
    }, 'json');
  }

});

window.EntityDates = new dc.model.EntitySet();

EntityDates.comparator = function(entity) {
  return entity.get('date');
};
