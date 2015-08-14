dc.analytics = {

  // Initializes the Google Analytics script asynchronously
  initialize : function() {
    window._gaq = window._gaq || [];
    _gaq.push(['_setAccount', 'UA-9312438-1']);
    _gaq.push(['_trackPageview']);
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  },

  // This is the callback that is fired when the history changes. Use this to send an event
  // to Google Analytics.
  trackEvent : function(hash) {
    if (hash.indexOf('search/') != -1) hash = 'search';
    _gaq.push(['_trackPageview', '/#' + hash]);
  }

};