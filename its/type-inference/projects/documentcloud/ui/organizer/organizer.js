dc.ui.Organizer = Backbone.View.extend({

  id : 'organizer',

  PRIVATE_SEARCHES: [
    'all_documents', 'your_documents', 'your_published_documents'
  ],

  PUBLIC_SEARCHES: [
    'all_documents', 'annotated_documents', 'published_documents', 'popular_documents'
  ],

  events : {
    'click #new_project'              : 'promptNewProject',
    'click .all_documents'            : 'showAllDocuments',
    'click .your_documents'           : 'showYourDocuments',
    'click .org_documents'            : 'showOrganizationDocuments',
    'click .annotated_documents'      : 'showAnnotatedDocuments',
    'click .published_documents'      : 'showPublishedDocuments',
    'click .popular_documents'        : 'showPopularDocuments',
    'click .your_published_documents' : 'showYourPublishedDocuments',
    'click .account_links .text_link' : 'showAccountDocuments',
    'click .toggle_account_links'     : 'toggleAccountLinks',
    'click .organization.box'         : 'showOtherOrgDocuments'
  },
  
  initialize: function(options) {
    _.bindAll(this, '_addSubView', '_removeSubView', 'renderAccounts');
    this._bindToSets();
    this.subViews = [];
  },

  render : function() {
    var searches = dc.account ? this.PRIVATE_SEARCHES : this.PUBLIC_SEARCHES;
    $(this.el).append(JST['organizer/sidebar']({searches : searches}));
    this.projectInputEl = this.$('#project_input');
    this.projectList    = this.$('.project_list');
    this.sidebar        = $('#sidebar');
    this.renderAccounts();
    this.renderAll();
    return this;
  },

  renderAll : function() {
    if (dc.account) {
      if (Projects.isEmpty()) this.setMode('no', 'projects');
      Projects.each(this._addSubView);
    } else {
      this.$('.organization_list').html(JST['organizer/organizations']({organizations: Organizations}));
    }
  },

  renderAccounts : function() {
    _.each( this.$('.account_links'), function(el){
      el = $(el);
      el.html( JST['organizer/account_links']( { organization: Organizations.get( el.attr('data-cid') )} )  );
    });
  },

  promptNewProject : function() {
    var me = this;
    dc.ui.Dialog.prompt(_.t('create_new_project'), '', function(title, dialog) {
      title = dc.inflector.trim(title);
      if (!title) {
        dialog.error( _.t('must_have_title') );
        return;
      }
      if (Projects.find(title)) return me._warnAlreadyExists(title);
      var count = _.inject(Documents.selected(), function(memo, doc){ return memo + doc.get('annotation_count'); }, 0);
      Projects.create({
        title             : title,
        annotation_count  : count,
        document_ids      : Documents.selectedIds(),
        owner             : true
      }, {wait: true});
      return true;
    }, {mode : 'short_prompt'});
  },

  highlight : function(projectName, groupName) {
    Projects.deselectAll();
    this.$('.organization').removeClass('is_selected');
    if (dc.account) {
      var project = projectName && Projects.find(projectName);
      if (project) return project.set({selected : true});
    } else {
      var org = groupName && Organizations.findBySlug(groupName);
      if (org) {
        this.$('#organization_' + org.id).addClass('is_selected');
      }
    }
  },

  showAllDocuments : function() {
    dc.app.searcher.search('');
  },

  showYourDocuments : function() {
    Accounts.current().openDocuments();
  },

  showAnnotatedDocuments : function() {
    dc.app.searcher.search(_.t('filter') + ': annotated');
  },

  showPublishedDocuments : function() {
    dc.app.searcher.search(_.t('filter') + ': published');
  },

  showPopularDocuments : function() {
    dc.app.searcher.search(_.t('filter') + ': popular');
  },

  showAccountDocuments : function(e) {
    var cid = $(e.target).attr('data-cid');
    Accounts.get(cid).openDocuments();
  },

  showYourPublishedDocuments : function() {
    Accounts.current().openDocuments({published : true});
  },

  showOrganizationDocuments : function(e) {
    $(e.target).closest('.organization').toggleClass('show_accounts');
    var cid = $(e.target).parent().find(".account_links").attr("data-cid");
    Organizations.get(cid).openDocuments();
  },

  showOtherOrgDocuments : function(e) {
    var el = $(e.currentTarget);
    Organizations.get(el.attr('data-id')).openDocuments();
  },

  // display the list of accounts for an organization
  toggleAccountLinks : function(e) {
    $(e.target).closest('div.organization').toggleClass('show_accounts');
  },

  // Bind all possible and Project events for rendering.
  _bindToSets : function() {
    Projects.bind('add',     this._addSubView);
    Projects.bind('remove',  this._removeSubView);
    Accounts.bind('all',     this.renderAccounts);
  },

  _warnAlreadyExists : function(title) {
    dc.ui.notifier.show({text : _.t('project_exists', title) });
    return false;
  },

  _addSubView : function(model) {
    this.setMode('has', 'projects');
    var view = new dc.ui.Project({model : model}).render();
    this.subViews.push(view);
    var index         = Projects.indexOf(view.model);
    var previous      = Projects.at(index - 1);
    var previousView  = previous && previous.view;
    if (index == 0 || !previous || !previousView) {
      $(this.projectList).prepend(view.el);
    } else {
      $(previousView.el).after(view.el);
    }
    dc.app.scroller.checkLater();
  },

  _removeSubView : function(model) {
    this.subViews = _.without(this.subViews, model.view);
    $(model.view.el).remove();
    dc.app.scroller.checkLater();
  }

});
