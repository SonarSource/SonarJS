// A simple iframe-based downloader that can fire a callback when the download
// has begun.
dc.app.download = function(url, callback) {
  dc.ui.spinner.show();
  var iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.display = 'none';
  // webkit's readyState will be complete immediatly
  // because the zip file is not "rendered" by the browser
  // https://code.google.com/p/chromium/issues/detail?id=32333#c16
  var timer = setInterval(function(){
    // firefox =='complete' ie == 'interactive'
    if (iframe.contentDocument.readyState == 'complete' || iframe.contentDocument.readyState == 'interactive') {
      dc.ui.spinner.hide();
      clearInterval(timer);
      if (callback) callback();
    }
  }, 5000);
  // if we remove the iframe before the zip finishes,
  // the download is canceled.
  // 15 minutes *should* be enough for everyone
  _.delay(function(){
    $(iframe).remove();
  },900000);
  $(document.body).append(iframe);
};
