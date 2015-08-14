dc.ui.OrganizationManager = Backbone.View.extend({
  className: 'organization',

  events: {
    'click .controls .save_changes': 'saveOrganization',
    'click .new_account' : 'newAccount'
  },

  initialize: function(options){
    this.dialog = options.dialog;
    this.membership = options.membership;
    this.memberViews = this.model.members.map(function(account){ 
      return new dc.ui.AccountView({model: account, kind: 'row', dialog: this.dialog}); 
    }, this);
    _.bindAll(this, '_onSuccess', '_onError');
  },

  render: function() {
    this.$el.html(JST['organization/details']({
      organization: this.model, 
      membership_description:   this.describeMembership(this.membership),
      languages: dc.language.NAMES
    }));
    this.list = this.$('.account_list_content');
    this.list.append(_.map( this.memberViews, function(view){ return view.render().el; }));
    this.$el.addClass('account_list');
    return this;
  },

  describeMembership: function(membership){
    return _.t( 'role_' + dc.model.Account.prototype.ROLE_NAMES[membership.get('role')] + '_for_x', this.model.get('name') );
  },

  newAccount : function() {
    var view = new dc.ui.AccountView({
      model : new dc.model.Account(),
      kind : 'row',
      dialog : this.dialog
    });
    this.list.prepend(view.render('edit').el);
  },
  
  saveOrganization: function() {
    var options = {success : this._onSuccess, error : this._onError};
    dc.ui.spinner.show();
    this.model.save({
      language: this.$('form select[name=language]').val(),
      document_language: this.$('form select[name=document_language]').val()
    }, options);
  },
  
  _onSuccess : function(model, resp) {
    this.model.invalid = false;
    dc.ui.spinner.hide();
    if (this.model) {
      this.model.newRecord = false;
      dc.ui.notifier.show({
        text      : _.t('saved') + " " + this.model.get('name'),
        duration  : 5000,
        mode      : 'info'
      });
    }
  },

  _onError : function(model, resp) {
    resp = JSON.parse(resp.responseText);
    model.invalid = true;
    dc.ui.spinner.hide();
    this.showEdit();
    this.dialog.error( resp.errors && resp.errors[0] || _.t('account_add_failure') );
  }
});
