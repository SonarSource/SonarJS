// The `dc.app.searcher` is the core controller for running document searches
// from the client side. It's main "view" is the dc.ui.SearchBox.
dc.controllers.Searcher = Backbone.Router.extend({

  // Error messages to display when your search returns no results.

 NO_RESULTS : {
  project    : _.t('not_found_project'),
  account    : _.t('not_found_account'),
  group      : _.t('not_found_group'),
   published : _.t('not_found_published'),
  annotated  : _.t('not_found_annotated'),
  search     : _.t('not_found_search'),
  all        : _.t('not_found_all')
 },

  PAGE_MATCHER  : (/\/p(\d+)$/),

  DOCUMENTS_URL : '/search/documents.json',

  FACETS_URL    : '/search/facets.json',

  fragment      : null,

  flags         : {},

  routes        : {
    'search/*query/p:page':  'searchByHash',
    'search/*query':         'searchByHash'
  },

  // Creating a new SearchBox registers #search page fragments.
  initialize : function() {
    this.searchBox = dc.app.searchBox;
    this.flags.hasEntities = false;
    this.currentSearch = null;
    this.titleBox = $('.search_tab_content .title_box_inner');
    _.bindAll(this, '_loadSearchResults', '_loadFacetsResults', '_loadFacetResults',
      'loadDefault', 'loadFacets');
    dc.app.navigation.bind('tab:search', this.loadDefault);
  },

  urlFragment : function() {
    return this.fragment + (this.page ? '/p' + this.page : '');
  },

  // Load the default starting-point search.
  loadDefault : function(options) {
    options || (options = {});
    if (options.clear) {
      Documents.reset();
      this.searchBox.value('');
    }
    if (this.currentSearch) return;
    if (!Documents.isEmpty()) {
      this.navigate(this.urlFragment());
      this.showDocuments();
    } else if (this.searchBox.value()) {
      this.search(this.searchBox.value());
    } else if (dc.account && dc.account.get('hasDocuments')) {
      Accounts.current().openDocuments();
    } else if (Projects.first()) {
      Projects.first().open();
    } else if (options.showHelp && dc.account) {
      dc.app.navigation.open('help');
    } else {
      this.search('');
    }
  },

  // Paginate forwards or backwards in the search results.
  loadPage : function(page, callback) {
    page = page || this.page || 1;
    var max = dc.app.paginator.pageCount();
    if (page < 1) page = 1;
    if (page > max) page = max;
    this.search(this.searchBox.value(), page, callback);
  },

  // Quote a string if necessary (contains whitespace).
  quote : function(string) {
    return string.match(/\s/) ? '"' + string + '"' : string;
  },

  publicQuery : function() {

    // Swap out projects.
    var projects = [];
    var projectNames = dc.app.visualSearch.searchQuery.values('project');
    _.each(projectNames, function(projectName) {
      projects.push(Projects.find(projectName));
    });
    var query = dc.app.visualSearch.searchQuery.withoutCategory('project');
    if ( ! _.isEmpty(projects) ){
      query = _.map(projects, function(p) { return 'projectid: ' + p.slug(); }).join(' ') + ' ' + query;
    }

    // Swap out documents for short ids.
    query = query.replace(/(document: \d+)-\S+/g, '$1');

    return query;
  },

  queryText : function() {
    return dc.app.visualSearch.searchQuery.find('text');
  },

  searchKeySubstitutions: function(){
    if ( dc.app && dc.app.workspace ){
      return this._searchKeys || ( this._searchKeys = _.invert( dc.app.workspace.searchKeySubstitutions  ) );
    } else {
      return {};
    }
  },

  searchValueSubstitutions: function(){
    if ( this._searchValues ){
      return this._searchValues;
    }
    if ( dc.app && dc.app.workspace ){
      var values = {};
      _.each( dc.app.workspace.searchValueSubstitutions, function(value,key) {
        values[ key ] = _.invert( value );
      });
      return this._searchValues = values;
    } else {
      return {};
    }
  },

  // Start a search for a query string, updating the page URL.
  search : function(query, pageNumber, callback) {
    dc.ui.spinner.show();
    dc.app.navigation.open('search');
    if (this.currentSearch) this.currentSearch.abort();
    this.searchBox.value(query);
    this.flags.related  = query.indexOf('related:') >= 0;
    this.flags.specific = query.indexOf('document:') >= 0;
    this.flags.hasEntities = false;
    this.page = pageNumber <= 1 ? null : pageNumber;
    this.fragment = 'search/' + query;
    this.showDocuments();
    this.navigate(this.urlFragment());
    Documents.reset();
    this._afterSearch = callback;

    var keys   = this.searchKeySubstitutions(),
        values = this.searchValueSubstitutions(),
        parts  = [];

    // Turn the translated strings back into the appropriate
    // keys and values to send to the server
    dc.app.visualSearch.searchQuery.each(_.bind(function(facet, i) {
      facet = facet.clone();
      var category = facet.get('category'),
          options  = values[ keys[category] ];
      facet.set({ category: keys[category] || category });
      if ( options ){
        facet.set({ value: options[ facet.get('value') ] || facet.get('value') });
      }
      parts.push(facet.serialize());
    }, this));

    var params = _.extend(dc.app.paginator.queryParams(), {q : parts.join(' ') });

    if (dc.app.navigation.isOpen('entities'))   params.include_facets = true;
    if (this.page)                              params.page = this.page;
    this.currentSearch = $.ajax({
      url:      this.DOCUMENTS_URL,
      data:     params,
      success:  this._loadSearchResults,
      error:    function(req, textStatus, errorThrown) {
        if (req.status == 403) Accounts.forceLogout();
      },
      dataType: 'json'
    });
  },

  showDocuments : function() {
    var query       = this.searchBox.value();
    var title       = dc.model.DocumentSet.entitle(query);
    var projectName = dc.app.visualSearch.searchQuery.find( _.t('project') );
    var groupName   = dc.app.visualSearch.searchQuery.find( _.t('group') );

    $(document.body).setMode('active', 'search');
    this.titleBox.html(title);
    dc.app.organizer.highlight(projectName, groupName);
  },

  // Hide the spinner and remove the search lock when finished searching.
  doneSearching : function() {
    var count      = dc.app.paginator.query.total;

    var searchType = this.searchType();

    if (this.flags.specific) {
      this.titleBox.text( _.t('x_documents', count ) );
    } else if (searchType == 'search') {
      var quote  = dc.app.visualSearch.searchQuery.has( _.t('project') );
      if ( count ){
        this.titleBox.html( _.t('x_results',count) );
      } else {
        this.titleBox.html( _.t('no_results_for', (quote ? '“' : '') + this.titleBox.html() + (quote ? '”' : '') ) );
      }
    }
    if (count <= 0) {
      $(document.body).setMode('empty', 'search');
      var explanation = this.NO_RESULTS[searchType] || this.NO_RESULTS['search'];
      $('#no_results .explanation').text(explanation);
    }
    dc.ui.spinner.hide();
    dc.app.scroller.checkLater();
  },

  searchType : function() {
    var single   = false;
    var multiple = false;

    dc.app.visualSearch.searchQuery.each(function(facet) {
      var category = facet.get('category');
      var value    = facet.get('value');

      if (value) {
        if (!single && !multiple) {
          single = category;
        } else {
          multiple = true;
          single = false;
        }
      }
    });

    if ( single == _.t('filter') ) {
      return dc.app.visualSearch.searchQuery.first().get('value');
    } else if (single == _.t('projectid') ) {
      return 'project';
    } else if (_.contains([_.t('project'), _.t('group'), _.t('account')], single)) {
      return single;
    } else if (!single && !multiple) {
      return 'all';
    }

    return 'search';
  },

  loadFacets : function() {
    if (this.flags.hasEntities) return;
    var query = this.searchBox.value() || '';
    dc.ui.spinner.show();
    this.currentSearch = $.get(this.FACETS_URL, {q: query}, this._loadFacetsResults, 'json');
  },

  loadFacet : function(facet) {
    dc.ui.spinner.show();
    this.currentSearch = $.get(this.FACETS_URL, {q : this.searchBox.value(), facet : facet}, this._loadFacetResults, 'json');
  },

  // When searching by the URL's hash value, we need to unescape first.
  searchByHash : function(query, page) {
    _.defer(_.bind(function() {
      this.search(query ? decodeURIComponent(query) : '', page && parseInt(page, 10));
    }, this));
  },

  // Toggle a query fragment in the search.
  toggleSearch : function(category, value) {
    if (dc.app.visualSearch.searchQuery.has(category)) {
      this.removeFromSearch(category);
    } else {
      this.addToSearch(category, value);
    }
  },

  // Add a query fragment to the search and search again, if it's not already
  // present in the current search.
  addToSearch : function(category, value, callback) {
    if (dc.app.visualSearch.searchQuery.has(category, value)) return;
    dc.app.visualSearch.searchQuery.add({category: category, value: value, app: dc.app.visualSearch});
    var query = dc.app.visualSearch.searchQuery.serialize();
    this.search(query, null, callback);
  },

  // Remove a query fragment from the search and search again, only if it's
  // present in the current search.
  removeFromSearch : function(category) {
    var query = dc.app.visualSearch.searchQuery.withoutCategory(category);
    this.search(query);
    return true;
  },

  viewEntities : function(docs) {
    dc.app.navigation.open('entities', true);
    this.search(_.map(docs, function(doc){ return 'document: ' + doc.canonicalId(); }).join(' '));
  },

  // After the initial search results come back, send out a request for the
  // associated metadata, as long as something was found. Think about returning
  // the metadata right alongside the document JSON.
  _loadSearchResults : function(resp) {
    dc.app.paginator.setQuery(resp.query, this);
    if (resp.facets) this._loadFacetsResults(resp);
    var docs = resp.documents;
    for (var i = 0, l = docs.length; i < l; i++) docs[i].index = i;
    Documents.reset(docs);
    this.doneSearching();
    this.currentSearch = null;
    if (this._afterSearch) this._afterSearch();
  },

  _loadFacetsResults : function(resp) {
    dc.app.workspace.entityList.renderFacets(resp.facets, 5, resp.query.total);
    dc.ui.spinner.hide();
    this.currentSearch = null;
    this.flags.hasEntities = true;
  },

  _loadFacetResults : function(resp) {
    dc.app.workspace.entityList.mergeFacets(resp.facets, 500, resp.query.total);
    dc.ui.spinner.hide();
    this.currentSearch = null;
  }

});
