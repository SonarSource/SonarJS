dc.ui.Admin = Backbone.View.extend({

  GRAPH_OPTIONS : {
    xaxis     : {mode : 'time', minTickSize: [1, "day"]},
    yaxis     : {},
    legend    : {show : false},
    series    : {lines : {show : true, fill : false}, points : {show : false}},
    grid      : {borderWidth: 1, borderColor: '#222', labelMargin : 7, hoverable : true}
  },

  DATE_TRIPLETS : /(\d+)(\d{3})/,

  DATE_FORMAT : "%b %d, %y",

  // Quick tags for the instances we know about. Purely for convenience.
  INSTANCE_TAGS : {
    'i-0d4e9065': 'staging',
    'i-a3466ecb': 'app01',
    'i-4752792f': 'db01',
    'i-c47d78b9': 'worker01',
    'i-c41216b9': 'worker02',
    'i-c61216bb': 'worker03',
    'i-c01216bd': 'worker04'
  },

  id        : 'statistics',
  className : 'serif',

  events : {
    'plothover .chart':           '_showTooltop',
    'click #instances .minus':    '_terminateInstance',
    'click .more_top_documents':  '_loadMoreTopDocuments',
    'click #load_all_accounts':   '_loadAllAccounts',
    'click .account_list .sort':  '_sortAccounts'
  },

  ACCOUNT_COMPARATORS : {
    name           : dc.model.AccountSet.prototype.comparator,
    email          : function(account){ return account.get('email').toLowerCase(); },
    organization   : function(account){ return account.get('orgnization_name').toLowerCase(); },
    document_count : function(account){ return -(account.get('public_document_count') || 0 + account.get('private_document_count') || 0); },
    page_count     : function(account){ return -account.get('page_count') || 0; }
  },

  initialize : function(options) {
    _.bindAll(this, 'renderCharts', 'launchWorker', 'reprocessFailedDocument', 'vacuumAnalyze', 'optimizeSolr', '_loadAllAccounts');
    this._tooltip = new dc.ui.Tooltip();
    this._actionsMenu = this._createActionsMenu();
    $(window).bind('resize', this.renderCharts);
  },

  render : function() {
    $(this.el).html(JST.statistics(this.data()));
    $('#topbar').append(this._actionsMenu.render().el);
    _.defer(this.renderCharts);
    if (Accounts.length) _.defer(this._loadAllAccounts);

    return this;
  },

  renderCharts : function() {
    this.$('.chart').html('');
    $.plot($('#daily_docs_chart'),  [this._series(stats.daily_documents, 'Document', 1), this._series(stats.daily_pages, 'Page', 2)], this.GRAPH_OPTIONS);
    $.plot($('#weekly_docs_chart'), [this._series(stats.weekly_documents, 'Document', 1), this._series(stats.weekly_pages, 'Page', 2)], this.GRAPH_OPTIONS);
    $.plot($('#daily_hits_chart'),  [this._series(stats.daily_hits_on_documents, 'Document Hit'), this._series(stats.daily_hits_on_notes, 'Note Hit'), this._series(stats.daily_hits_on_searches, 'Search Hit')], this.GRAPH_OPTIONS);
    $.plot($('#weekly_hits_chart'), [this._series(stats.weekly_hits_on_documents, 'Document Hit'), this._series(stats.weekly_hits_on_notes, 'Note Hit'), this._series(stats.weekly_hits_on_searches, 'Search Hit')], this.GRAPH_OPTIONS);
  },

  // Convert a date-hash into JSON that flot can properly plot.
  _series : function(data, title, axis) {
    return {
      title : title,
      yaxis : axis,
      color : axis == 1 ? '#7EC6FE' : '#199aff',
      data  : _.sortBy(_.map(data, function(val, key) {
        return [parseInt(key, 10) * 1000, val];
      }), function(pair) {
        return pair[0];
      })
    };
  },

  renderAccounts : function() {
    this.$('#accounts_wrapper').html((new dc.ui.AdminAccounts()).render().el);
  },

  data : function() {
    var acl = stats.documents_by_access, a = dc.access;
    return {
      total_documents               : this._format(this.totalDocuments()),
      embedded_documents            : this._format(stats.embedded_documents),
      total_pages                   : this._format(stats.total_pages),
      average_page_count            : this._format(stats.average_page_count),
      public_docs                   : this._format(acl[a.PUBLIC] || 0),
      private_docs                  : this._format((acl[a.PRIVATE] || 0) + (acl[a.ORGANIZATION] || 0) + (acl[a.EXCLUSIVE] || 0)),
      pending_docs                  : this._format(acl[a.PENDING] || 0),
      error_docs                    : this._format(acl[a.ERROR] || 0),
      instance_tags                 : this.INSTANCE_TAGS,
      remote_url_hits_last_week     : this._format(stats.remote_url_hits_last_week),
      remote_url_hits_all_time      : this._format(stats.remote_url_hits_all_time),
      count_organizations_embedding : this._format(stats.count_organizations_embedding),
      count_total_collaborators     : this._format(stats.count_total_collaborators)

    };
  },

  totalDocuments : function() {
    return _.reduce(stats.documents_by_access, function(sum, value) {
      return sum + value;
    }, 0);
  },

  launchWorker : function() {
    dc.ui.Dialog.confirm('Are you sure you want to launch a new Medium Compute<br />\
      EC2 instance for document processing, on <b>production</b>?', function() {
      $.post('/admin/launch_worker', function() {
        dc.ui.Dialog.alert(
          'The worker instance has been launched successfully.\
          It will be a few minutes before it comes online and registers with CloudCrowd.'
        );
      });
      return true;
    });
  },

  vacuumAnalyze : function() {
    $.post('/admin/vacuum_analyze', function() {
      dc.ui.Dialog.alert('The vacuum background job was started successfully.');
    });
  },

  optimizeSolr : function() {
    $.post('/admin/optimize_solr', function() {
      dc.ui.Dialog.alert('The Solr optimization task was started successfully.');
    });
  },

  forceBackup : function() {
    $.post('/admin/force_backup', function() {
      dc.ui.Dialog.alert('The database backup job was started successfully.');
    });
  },

  reprocessFailedDocument : function() {
    dc.ui.Dialog.confirm('Are you sure you want to re-import the last failed document?', function() {
      $.post('/admin/reprocess_failed_document', function() {
        window.location.reload(true);
      });
      return true;
    });
  },

  _terminateInstance : function(e) {
    var instanceId = $(e.target).attr('data-id');
    dc.ui.Dialog.confirm('Are you sure you want to terminate instance <b>' + instanceId + '</b>?', function() {
      $.post('/admin/terminate_instance', {instance: instanceId}, function() {
        dc.ui.Dialog.alert('Instance <b>' + instanceId + '</b> is shutting down.');
      });
      return true;
    });
  },

  _sortAccounts : function(e) {
    var sort = $(e.target).attr('data-sort');
    Accounts.comparator = this.ACCOUNT_COMPARATORS[sort];
    Accounts.sort();
    this.renderAccounts();
    $('.account_list .sort_' + sort).addClass('active');
  },

  // Create a tooltip to show a hovered date.
  _showTooltop : function(e, pos, item) {
    if (!item) return this._tooltip.hide();
    var count = item.datapoint[1];
    var date  = $.plot.formatDate(new Date(item.datapoint[0]), this.DATE_FORMAT);
    var title = dc.inflector.pluralize(item.series.title, count);
    this._tooltip.show({
      left : pos.pageX,
      top  : pos.pageY,
      title: count + ' ' + title,
      text : date
    });
  },

  _loadAllAccounts : function() {
    $('#load_all_accounts').hide();
    $('.minibutton.download_csv').hide();
    var finish = _.bind(function() {
      this.renderAccounts();
      this._addCountsToAccounts();
      $('tr.accounts_row').show();
    }, this);
    if (Accounts.length) return finish();
    $.getJSON('/admin/all_accounts', {}, _.bind(function(resp) {
      Accounts.reset(resp.accounts);
      delete resp.accounts;
      _.extend(stats, resp);
      finish();
    }, this));
  },

  // Loads the top 100 published documents, sorted by number of hits in the past year.
  _loadMoreTopDocuments : function(e) {
    $.getJSON('/admin/hits_on_documents', {}, _.bind(this._displayMoreTopDocuments, this));
  },

  // Displays all top documents, retrieved through AJAX.
  _displayMoreTopDocuments : function(data) {
    TopDocuments.reset(data);
    this.$('.top_documents_list').replaceWith(JST['top_documents']({}));
    this.$('.top_documents_label_year').css({'display': 'table-row'});
    this.$('.top_documents_label_week').css({'display': 'none'});
  },

  // Format a number by adding commas in all the right places.
  _format : function(number) {
    var parts = (number + '').split('.');
    var integer = parts[0];
    var decimal = parts.length > 1 ? '.' + parts[1] : '';
    while (this.DATE_TRIPLETS.test(integer)) {
      integer = integer.replace(this.DATE_TRIPLETS, '$1,$2');
    }
    return integer + decimal;
  },

  _createActionsMenu : function() {
    return new dc.ui.Menu({
      label   : 'Administrative Actions',
      id      : 'admin_actions',
      items   : [
        {title : 'Update Dashboard Stats',    onClick : function(){ window.location = '/admin/expire_stats'; }},
        {title : 'Add an Organization',       onClick : function(){ window.location = '/admin/signup'; }},
        {title : 'View CloudCrowd Console',   onClick : function(){ window.location = CLOUD_CROWD_SERVER; }},
        {title : 'Reprocess Last Failed Doc', onClick : this.reprocessFailedDocument},
        {title : 'Force a DB Backup to S3',   onClick : this.forceBackup},
        {title : 'Vacuum Analyze the DB',     onClick : this.vacuumAnalyze},
        {title : 'Optimize the Solr Index',   onClick : this.optimizeSolr},
        {title : 'Launch a Worker Instance',  onClick : this.launchWorker},
        {title : 'Edit Featured Reporting',   onClick : function(){ window.location = '/admin/featured'; } }
      ]
    });
  },

  _addCountsToAccounts : function() {
    Accounts.each(function(acc) {
      acc.set({
        public_document_count   : stats.public_per_account[acc.id],
        private_document_count  : stats.private_per_account[acc.id],
        page_count              : stats.pages_per_account[acc.id]
      });
    });
  }

});