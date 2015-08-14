
dc.model.FeaturedReport = Backbone.Model.extend({

  defaults: {
    title            : '',
    url              : '',
    organization     : '',
    article_date     : '',
    writeup          : '',
    writeup_html     : '',
    other_links      : '',
    other_links_html : ''
  }


});


dc.model.FeaturedReports = Backbone.Collection.extend({
  model : dc.model.FeaturedReport,
  url   : '/featured'


});
