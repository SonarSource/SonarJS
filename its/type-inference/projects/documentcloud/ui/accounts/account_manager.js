dc.ui.AccountManager = Backbone.View.extend({
  id: "account_manager_container",
  className: 'accounts_tab_content',

  options: {
    information: null
  },

  initialize: function(options){
    this.options           = _.extend(this.options, options);
    this.model             = dc.account;
    this.organizationViews = {};
    this.createSubViews();
    _.bindAll(this, 'open', 'showOrganization', 'showUser');
    dc.app.navigation.bind('tab:accounts', this.open);
  },
  
  createSubViews: function() {
    this.userView = new dc.ui.AccountView({model: this.model, kind: "user", dialog: this});
    this.model.organizations().each(function(organization){ 
      this.organizationViews[organization.cid] = new dc.ui.OrganizationManager({
        model: organization, 
        membership: this.model.memberships.findWhere({organization_id: organization.get('id')}),
        dialog: this});
    }, this);
  },
  
  render: function() {
    this.$el.html(JST['account/manager'](this.options));
    this._renderSubViews();
    this._information = this.$('.information');
    this._title = this.$('.title_box_inner');
    return this.$el;
  },
  
  _renderSubViews: function() {
    this.$el.append(this.userView.render().el);
    this.$el.append(JST['organization/list']());
    this.$('.organizations').append(_.map(this.organizationViews, function(view, cid){ return view.render().el; }));
  },
  
  open: function() {
    // note needs a guard against opening
    // accounts panel when in the public workspace
    // or dc.account otherwise isn't set.
    this.showUser();
    dc.app.navigation.open('accounts', true);
    Backbone.history.navigate('accounts');
  },

  close: function() {  /* noop so that AccountViews think this is a dialog. */ },
  isOpen: function() { /* noop so that AccountViews think this is a dialog. */ },
  
  showOrganization: function(org) {
    // find org subview. set it's mode to display
    if (this.currentOrganization) { this.currentOrganization.setMode('hide', 'view'); }
    this.currentOrganization = this.organizationViews[org.cid];
    this._title.html(org.get('name'));
    this.currentOrganization.setMode('display', 'view');
    this.setMode('organization');
  },
  
  showUser: function() { 
    this._title.html(_.t('account'))
    this.setMode('user');
  },
  
  error : function(message, leaveOpen) {
    this._information.stop().addClass('error').text(message).show();
    if (!leaveOpen) this._information.delay(3000).fadeOut();
  }
});
