dc.ui.TimelineDialog = dc.ui.Dialog.extend({

  GRAPH_OPTIONS : {
    xaxis     : {mode : 'time', minTickSize: [1, "day"]},
    yaxis     : {ticks: [], min: -0.5},
    selection : {mode : 'x', color: '#09f'},
    legend    : {show : false},
    series    : {lines : {show : false}, points : {show : true, radius: 4, fill: true, fillColor: 'rgba(255, 255, 235, 0.7)'}},
    grid      : {backgroundColor: '#fff', tickColor: '#ddd', borderWidth: 0, hoverable : true, clickable : true}
  },

  ROW_HEIGHT : 50,
  MIN_HEIGHT : 100,

  DATE_FORMAT : "%b %d, %y",

  POINT_COLOR : '#555',

  id : 'timeline_dialog',

  events : {
    'click .zoom_out':              '_zoomOut',
    'click .ok':                    'confirm',
    'plothover .timeline_plot':     '_showTooltop',
    'plotselected .timeline_plot':  '_zoomIn',
    'plotclick .timeline_plot':     '_openPage'
  },

  constructor : function(documents) {
    this.documents = documents;
    dc.ui.Dialog.call(this, {
      mode        : 'custom',
      title       : this.displayTitle(),
      information : _.t('timeline_zoom_in')
    });
    dc.ui.spinner.show();
    this._loadDates();
  },

  render : function() {
    dc.ui.Dialog.prototype.render.call(this);
    this.$('.custom').html(JST['document/timeline']({docs : this.documents, minHeight : this.MIN_HEIGHT, rowHeight : this.ROW_HEIGHT}));
    this._zoomButton = this.make('span', {'class' : 'minibutton zoom_out dark not_enabled'}, _.t('zoom_out'));
    this.addControl(this._zoomButton);
    this.center();
    return this;
  },

  displayTitle : function() {
    if (this.documents.length == 1 )
      return _.t('timeline_for_doc', dc.inflector.truncate(this.documents[0].get('title'), 55) );
    else
      return _.t('timeline_for_x_docs', this.documents.length );
  },

  // Redraw the Flot Plot.
  drawPlot : function() {
    $.plot(this.$('.timeline_plot'), this._data, this._options);
  },

  _loadDates : function() {
    var dates = _.pluck(this.documents, 'id');
    $.getJSON('/documents/dates', {'ids[]' : dates}, _.bind(this._plotDates, this));
  },

  // Chart the dates for the selected documents.
  _plotDates : function(resp) {
    dc.ui.spinner.hide();
    if (resp.dates.length == 0) return this._noDates();
    this.render();
    var color = this.POINT_COLOR;
    var series = {}, styles = {}, ids = this._dateIds = {};
    _.each(this.documents, function(doc, i) {
      ids[doc.id]      = {};
      series[doc.id]   = [];
      styles[doc.id]   = {pos : i, color : color};
    });
    _.each(resp.dates, function(json) {
      var docId         = json.document_id;
      var date          = json.date * 1000;
      ids[docId][date]  = json.id;
      series[docId].push([date, styles[docId].pos]);
    });
    this._data = _.map(series, function(val, key) {
      return {data : val, color : styles[key].color, docId : parseInt(key, 10)};
    });
    this._options = _.clone(this.GRAPH_OPTIONS);
    this._options.xaxis.min   = null;
    this._options.xaxis.max   = null;
    this._options.yaxis.max   = this.documents.length - 0.5;
    this._options.yaxis.ticks = _.map(this.documents, function(doc){
      return [styles[doc.id].pos, dc.inflector.truncate(doc.get('title'), 30)];
    });
    this.drawPlot();
  },

  // Create a tooltip to show a hovered date.
  _showTooltop : function(e, pos, item) {
    this._pos = pos;
    if (this._request) return;
    if (!item) return dc.ui.tooltip.hide();
    var docId = item.series.docId;
    var id    = this._dateIds[docId][item.datapoint[0]];
    var model = EntityDates.get(id);
    if (model) return this._renderTooltip(model);
    this._request = $.getJSON('/documents/dates', {id : id}, _.bind(function(resp) {
      delete this._request;
      if (!resp) return;
      var model   = new dc.model.Entity(resp.date);
      EntityDates.add(model);
      this._renderTooltip(model);
    }, this));
  },

  _renderTooltip : function(date) {
    var title   = dc.inflector.truncate(Documents.get(date.get('document_id')).get('title'), 45);
    var excerpt = date.get('excerpts')[0];
    dc.ui.tooltip.show({
      left  : this._pos.pageX,
      top   : this._pos.pageY,
      title : title,
      text  : '<b>p.' + excerpt.page_number + '</b> ' + dc.inflector.trimExcerpt(excerpt.excerpt)
    });
  },

  // Allow clicking on date ranges to jump to the page containing the date
  // in the document.
  _openPage : function(e, pos, item) {
    if (!item) return;
    var unixTime = item.datapoint[0] / 1000;
    var doc = Documents.get(item.series.docId);
    window.open(doc.viewerUrl() + "?date=" + unixTime);
  },

  // Allow selection of date ranges to zoom in.
  _zoomIn : function(e, ranges) {
    $(this._zoomButton).setMode('is', 'enabled');
    this._options.xaxis.min = ranges.xaxis.from;
    this._options.xaxis.max = ranges.xaxis.to;
    this.drawPlot();
  },

  // Zoom back out to see the entire timeline.
  _zoomOut : function() {
    $(this._zoomButton).setMode('not', 'enabled');
    this._options.xaxis.min = null;
    this._options.xaxis.max = null;
    this.drawPlot();
  },

  // Close, with an error, when no dates are found.
  _noDates : function() {
    var count = this.documents.length;
    this.close();
    dc.ui.Dialog.alert( _.t('no_dates_for_timeline', count, this.documents[0].get('title') ) );
  }

});
