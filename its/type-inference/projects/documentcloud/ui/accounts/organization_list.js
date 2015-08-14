dc.ui.OrganizationList = Backbone.View.extend({
  id: 'organization_list',
  
  events: {
    'click .organization.box': 'openAccountList'
  },

  render: function() {
    this.$el.html(JST['organizer/organizations']({organizations: dc.account.organizations() }));
    return this;
  },
  
  openAccountList: function(e) {
    var cid = $(e.target).closest('.organization').attr("data-id");
    Organizations.get(cid).openAccounts();
  }
});