dc.ui.EntityList = Backbone.View.extend({

  id : 'entities',

  events : {
    'click .row'           : '_filterFacet',
    'click .cancel_search' : '_removeFacet',
    'click .more'          : '_loadFacet',
    'click .less'          : '_showLess',
    'click .show_pages'    : '_showPages'
  },

  ENTITY_KINDS : ['city', 'country', 'term', 'state', 'person', 'place', 'organization', 'email', 'phone'],

  // Refresh the facets with a new batch.
  renderFacets : function(facets, limit, docCount) {
    this._docCount = docCount;
    var filtered   = this.extractEntities(dc.app.searchBox.value());
    _.each(filtered, function(filter) {
      var list  = facets[filter.type];
      if (!list) return;
      var index = null;
      var facet = _.detect(list, function(f, i) {
        index = i;
        return f.value.toLowerCase() == filter.value.toLowerCase();
      });
      if (facet) {
        facet.active = true;
        list.splice(index, 1);
      } else {
        facet = {value : filter.value, count : docCount, active : true};
        list.pop();
      }
      facets[filter.type].unshift(facet);
    });
    this._facets = facets;
    $(this.el).html(JST['workspace/entities']({entities : facets, limit : limit}));
    dc.app.scroller.checkLater();
  },

  // Just add to the facets, don't blow them away.
  mergeFacets : function(facets, limit, docCount) {
    this.renderFacets(_.extend(this._facets, facets), limit, docCount);
  },

  _facetValueFor : function(el) {
    var row = $(el).closest('.row');
    var val = row.attr('data-value');
    var cat = row.attr('data-category');
    return {category: cat, value: val};
  },

  _filterFacet : function(e) {
    var facet = this._facetValueFor(e.target);
    dc.app.searcher.addToSearch(facet.category, facet.value);
  },

  _removeFacet : function(e) {
    $(e.target).closest('.row').removeClass('active');
    var facet = this._facetValueFor(e.target);
    dc.app.searcher.removeFromSearch(facet.category);
    return false;
  },

  _loadFacet : function(e) {
    $(e.target).html('loading &hellip;');
    dc.app.searcher.loadFacet($(e.target).attr('data-category'));
  },

  _showLess : function(e) {
    var cat = $(e.target).attr('data-category');
    this._facets[cat].splice(6);
    this.renderFacets(this._facets, 5, this._docCount);
  },

  _showPages : function(e) {
    var el        = $(e.target).closest('.row');
    var kind      = el.attr('data-category');
    var value     = el.attr('data-value');
    var active    = el.hasClass('active');
    var fetch     = _.bind(function() {
      dc.model.Entity.fetch(kind, value, this._connectExcerpts);
    }, this);
    var next = fetch;
    if (!active) {
      var facet = this._facetValueFor(el);
      next = _.bind(function() {
        dc.app.searcher.addToSearch(facet.category, facet.value, fetch);
      }, this);
    }
    dc.app.paginator.ensureRows(next);
    return false;
  },

  _connectExcerpts : function(entities) {
    var sets = _.reduce(entities, function(memo, ent) {
      var docId = ent.get('document_id');
      memo[docId] = memo[docId] || [];
      memo[docId].push(ent);
      return memo;
    }, {});
    _.each(sets, function(set) {
      Documents.get(set[0].get('document_id')).pageEntities.reset(set);
    });
  },

  extractEntities : function(query) {
    var entities = dc.app.visualSearch.searchQuery.filter(_.bind(function(facet) {
      return _.include(this.ENTITY_KINDS, facet.get('category'));
    }, this));
    return _.sortBy(_.map(entities, function(ent) {
      return {type: ent.get('category'), value: ent.get('value')};
    }), function(ent) {
      return ent.value.toLowerCase();
    }).reverse();
  }

});
