dc.ui.AdminAccounts = Backbone.View.extend({

  // Keep in sync with account.rb and accounts.js
  DISABLED      : 0,
  ADMINISTRATOR : 1,
  CONTRIBUTOR   : 2,
  REVIEWER      : 3,
  FREELANCER    : 4,

  render : function() {
    $(this.el).html(JST.admin_accounts({}));
    var rows = Accounts.map(function(account) {
      return (new dc.ui.AccountView({model : account, kind : 'admin'})).render().el;
    });
    this.$('tbody').append(rows);
    return this;
  },

  isAdmin : function() {
    return this.get('role') == this.ADMINISTRATOR;
  }

});