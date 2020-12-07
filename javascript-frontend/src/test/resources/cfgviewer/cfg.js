var lastAnalyzed = "";
var output;

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

function displayCfg(jsCode, a) {

    loadCfg(a.analyze(jsCode));
    lastAnalyzed = jsCode;
}

window.onload = function() {
  var textarea = document.getElementById("textarea");
  var ana = window.analyzer;
  textarea.onkeyup = function() {
    displayCfg(this.value, ana)
  }
  output = document.getElementById("output");
  output.innerHTML += "+" + ana + " " + (typeof ana);
  displayCfg(textarea.value, ana);
}

