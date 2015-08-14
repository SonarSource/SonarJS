
dc.ui.FeaturedReport = Backbone.View.extend({

  attributes: {
    'class': 'report'
  },

  events: {
    'click .ok'         : 'save',
    'click .edit_glyph' : 'edit',
    'click .cancel'     : 'cancel',
    'click .delete'     : 'deleteReport'
  },

  initialize: function(options) {
    _.bindAll(this,'_onError','_onSuccess');
  },

  renderTmpl: function( editing ){
    var tmpl = ( editing ? JST['featured_report_edit'] : JST['featured_report_display'] ),
        json = this.model.toJSON();
    this.$el.html( tmpl( json ) ).attr('data-id', this.model.id );
  },

  render: function(){
    this.renderTmpl( this.model.isNew() );

    return this;
  },

  cancel: function(){
    if ( this.model.isNew() ){ // hmm how to kill ourselves?
      // get our parent to do it for us
      this.model.collection.remove( this.model );
    } else { 
      this.render();
    }
  },

  deleteReport: function(){
    this.model.destroy({
      success: function(model,resp){
        model.collection.remove( model );
      }
    });
  },

  edit: function(){
    this.renderTmpl( true );
  },

  _onSuccess : function(model, resp) {
    this.render();
    dc.ui.spinner.hide();
  },

  _onError : function(model, resp) {
    resp = JSON.parse(resp.responseText);
    if ( resp.errors ){
      this.$('.errors').html( "The following errors were encountered:<ul>" + 
                              _.reduce( resp.errors, function(memo,err){ return memo + '<li>'+err+'</li>'; }, '' ) + 
                              '</ul>' );
    }
    dc.ui.spinner.hide();
  },

  save: function(){
    dc.ui.spinner.show( 'Saving' );
    this.model.save( this.$('form.edit').serializeJSON(), {
      error: this._onError,
      success: this._onSuccess
    });

  }


});

dc.ui.FeaturedReporting = Backbone.View.extend({

  attributes: {
    'class': 'featured_reports'
  },

  events: {
    'click .toAdmin' : 'visitAdmin',
    'click .reload'  : 'reload',
    'click .add'     : 'addReport'
  },

  initialize: function(options) {
    _.bindAll(this,'appendReport','prependReport','render','saveSortOrder');
    this.collection.bind( 'reset',  this.render );
    this.collection.bind( 'add',    this.prependReport );
    this.collection.bind( 'remove', this.render );
  },

  saveSortOrder: function(){
    var ids = _.map( this.$('.listing .report[data-id]'), function( el ){
      return el.getAttribute('data-id');
    });
    $.ajax( this.collection.url + '/present_order', {
      data: { order: ids }
    } );
  },

  addReport: function(){
    this.collection.add({ });

  },

  prependReport: function( model ){
    var report = new dc.ui.FeaturedReport( { model: model });
    this.$('.listing').prepend( report.render().el );
  },

  appendReport: function( model ){
    var report = new dc.ui.FeaturedReport( { model: model });
    this.$('.listing').append( report.render().el );
  },

  render: function() {
    this.$el.html( JST.featured_reporting( {} ) );

    this.collection.each( this.appendReport );
    this.$('.listing').sortable({
      placeholder: "drop-placeholder",
      forcePlaceholderSize: true,
      stop:  this.saveSortOrder
    });
    return this;
  },

  reload: function() {
    this.collection.fetch();
  },

  visitAdmin: function() {
    window.location = '/admin/';
  }

});
