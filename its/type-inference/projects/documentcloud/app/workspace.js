// Main controller for the journalist workspace. Orchestrates subviews.
dc.controllers.Workspace = Backbone.Router.extend({

  routes : {
    'help/:page': 'help',
    'help':       'help',
    'accounts':   'accounts'
  },

  // Initializes the workspace, binding it to <body>.
  initialize : function() {
    this.createSubViews();
    this.renderSubViews();
    dc.app.searcher = new dc.controllers.Searcher;
    if (!Backbone.history.start({pushState : true, root : dc.account ? '/' : '/public/'})) {
      dc.app.searcher.loadDefault({showHelp: true});
    }
  },

  accounts: function() {
    dc.app.accounts.open();
  },

  help : function(page) {
    this.help.openPage(page || '');
  },

  // Create all of the requisite subviews.
  createSubViews : function() {
    dc.app.paginator      = new dc.ui.Paginator();
    dc.app.navigation     = new dc.ui.Navigation();
    dc.app.toolbar        = new dc.ui.Toolbar();
    dc.app.organizer      = new dc.ui.Organizer();
    dc.ui.notifier        = new dc.ui.Notifier();
    dc.ui.tooltip         = new dc.ui.Tooltip();
    dc.app.visualSearch   = new VS.VisualSearch(this.searchOptions());
    dc.app.searchBox      = dc.app.visualSearch.searchBox;
    dc.i18n               = I18n.noConflict();
    this.sidebar          = new dc.ui.Sidebar();
    this.panel            = new dc.ui.Panel();
    this.documentList     = new dc.ui.DocumentList();
    this.entityList       = new dc.ui.EntityList();

    if (!dc.account) return;
    dc.app.accountSearch          = new VS.VisualSearch(this.accountSearchOptions());
    dc.app.accountSearchBox       = dc.app.accountSearch.searchBox;
    dc.app.accounts               = new dc.ui.AccountManager();
    dc.app.accounts.organizations = new dc.ui.OrganizationList();

    dc.app.uploader        = new dc.ui.UploadDialog();
    dc.app.accounts.dialog = new dc.ui.AccountDialog();
    this.accountBadge      = new dc.ui.AccountView({model : Accounts.current(), kind : 'badge'});
  },

  // Render all of the existing subviews and place them in the DOM.
  renderSubViews : function() {
    var content   = $('#content');
    content.append(this.sidebar.render().el);
    content.append(this.panel.render().el);
    dc.app.navigation.render();
    dc.app.hotkeys.initialize();
    this.help = new dc.ui.Help({el : $('#help')[0]}).render();
    this.panel.add('search_box', dc.app.searchBox.render().el);
    this.panel.add('pagination', dc.app.paginator.el);
    this.panel.add('search_toolbar', dc.app.toolbar.render().el);
    this.panel.add('document_list', this.documentList.render().el);
    this.sidebar.add('entities', this.entityList.render().el);
    $('#no_results_container').html(JST['workspace/no_results']({}));
    this.sidebar.add('organizer', dc.app.organizer.render().el);

    if (!dc.account) return;
    dc.app.accounts.setElement($("#accounts_manager_container"));
    dc.app.accounts.render();
    this.panel.add('account_search_box', dc.app.accountSearchBox.render().el);
    this.sidebar.add('organization_list', dc.app.accounts.organizations.render().el);
    this.sidebar.add('account_badge', this.accountBadge.render().el);
  },

  // Translated Search keys
  searchKeySubstitutions: {
    text:      _.t('text'),
    account:   _.t('account'),
    project:   _.t('project'),
    filter:    _.t('filter'),
    access:    _.t('access'),
    title:     _.t('title'),
    source:    _.t('source'),
    group:     _.t('group'),
    'document':  _.t('document'),
    projectid: _.t('projectid')
  },

  // Translated pre-defined search values
  searchValueSubstitutions:{
    access: {
      'public':     _.t('public'),
      'private':    _.t('private'),
      organization: _.t('organization', 1),
      pending:      _.t('pending'),
      error:        _.t('error')
    },
    filter: {
      annotated:   _.t('annotated'),
      popular:     _.t('popular'),
      published:   _.t('published'),
      unpublished: _.t('unpublished'),
      restricted:  _.t('restricted')
    }
  },

  searchOptions : function() {
    // store the translated search key and values locally
    // so they can be referenced inside callbacks
    var keys   = this.searchKeySubstitutions,
        values = this.searchValueSubstitutions;

    return {
      unquotable : [
        keys.text,
        keys.account,
        keys.document,
        keys.filter,
        keys.group,
        keys.access,
        keys.projectid
      ],
      callbacks : {
        search : function(query, facets ) {
          if (!dc.app.searcher.flags.outstandingSearch) {
            dc.app.paginator.hide();
            _.defer(dc.app.toolbar.checkFloat);
            dc.app.searcher.search( query );
          }
          return false;
        },
        focus : function() {
          Documents.deselectAll();
        },

        valueMatches : function(category, searchTerm, cb) {
          switch (category) {
          case keys.account:
              cb(Accounts.map(function(a) { return {value: a.get('slug'), label: a.fullName()}; }));
              break;
            case keys.project:
              cb(Projects.pluck('title'));
              break;
            case keys.filter:
              cb( _.values( values.filter ) );
              break;
            case keys.access:
              cb( _.values( values.access ) );
              break;
            case keys.title:
              cb(_.uniq(Documents.pluck('title')));
              break;
            case keys.source:
              cb(_.uniq(_.compact(Documents.pluck('source'))));
              break;
            case keys.group:
              cb(Organizations.map(function(o) { return {value: o.get('slug'), label: o.get('name') }; }));
              break;
            case keys.document:
              cb(Documents.map(function(d){ return {value: d.canonicalId(), label: d.get('title')}; }));
              break;
            default:
              // Meta data
              cb(_.compact(_.uniq(Documents.reduce(function(memo, doc) {
                if (_.size(doc.get('data'))) memo.push(doc.get('data')[category]);
                return memo;
              }, []))));
          }
        },
        facetMatches : function(cb) {
          var prefixes = [
            { label: keys.project,     category: '' },
            { label: keys.text,        category: '' },
            { label: keys.title,       category: '' },
            { label: keys.description, category: '' },
            { label: keys.source,      category: '' },
            { label: keys.account,     category: '' },
            { label: keys.document,    category: '' },
            { label: keys.filter,      category: '' },
            { label: keys.group,       category: '' },
            { label: keys.access,      category: '' },
            { label: keys.projectid,   category: '' }
          ];
          var metadata = _.map(_.keys(Documents.reduce(function(memo, doc) {
            if (_.size(doc.get('data'))) _.extend(memo, doc.get('data'));
            return memo;
          }, {})), function(key) {
            return {label: key, category: ''};
          });
          cb && cb(prefixes.concat(metadata));
        }
      }
    };
  },
  
  accountSearchOptions: function() {
    return {
      
    };
  }

});
