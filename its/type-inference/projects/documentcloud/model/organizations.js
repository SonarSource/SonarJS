// Organization Model

dc.model.Organization = Backbone.Model.extend({
  initialize : function(attrs, options) {
    this.members = new dc.model.AccountSet();
    this.members.reset(this.get('members'));
  },  

  groupSearchUrl : function() {
    return "/#search/" + encodeURIComponent(this.query());
  },

  openDocuments : function() {
    dc.app.searcher.search(this.query());
  },
  
  openAccounts : function() {
    dc.app.accounts.showOrganization(this);
  },

  query : function() {
    return _.t('group') + ': ' + this.get('slug');
  },

  statistics : function() {
    var docs  = this.get('document_count');
    var notes = this.get('note_count');
    var accounts = this.members.size();
    var stats = [];
    if (accounts) { stats.push( _.t('x_accounts', accounts ) ); }
    if (docs) {     stats.push( _.t('x_documents', docs)     ); }
    if (notes) {    stats.push( _.t('x_notes', notes)        ); }
    return stats.join(', ');
  }

});

// Organization Set

dc.model.OrganizationSet = Backbone.Collection.extend({

  model : dc.model.Organization,
  url   : '/organizations',

  comparator : function(org) {
    return org.get('name').toLowerCase().replace(/^the\s*/, '');
  },

  findBySlug : function(slug) {
    return this.detect(function(org){ return org.get('slug') == slug; });
  }

});


window.Organizations = new dc.model.OrganizationSet();
