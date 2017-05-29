var lastAnalyzed = "";

window.onload = function() {
  var textarea = document.getElementById("textarea");
  textarea.onkeyup = function() {
    displayCfg(this.value);
  }
  displayCfg(textarea.value);
}

function displayCfg(jsCode) {
  if (jsCode != lastAnalyzed) {
    loadCfg(analyzer.analyze(jsCode));
    lastAnalyzed = jsCode;
  }
}

function loadCfg(dotString) {
  var parsedData = vis.network.convertDot(dotString.replace(/\\n/g, "\n"));

  var data = {
    nodes: parsedData.nodes,
    edges: parsedData.edges
  }

  var options = parsedData.options;

  options.nodes = {
    color: '#eee',
    shape: 'box',
    font: {
      size: 12,
      face: 'monospace',
      color: '#333',
      align: 'left'
    }
  }

  options.layout = {
    hierarchical: {
      enabled: true,
      sortMethod: 'directed',
      levelSeparation: 100,
      nodeSpacing: 1
    }
  }
 options.edges = {
   font: {
      color: 'grey',
      size: '10'
   }
 }

  new vis.Network(container, data, options);
};
