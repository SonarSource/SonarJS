dc.controllers.AccountSearcher = Backbone.Router.extend({
  initialize: function() {
    if (dc.account) { this.currentOrganization = dc.account.currentOrganization(); }
  },

  showOrganization: function(organization){
    this.currentOrganization = organization
  },
  
  showUser: function() {
    
  }
  
});