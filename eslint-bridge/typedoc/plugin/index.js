const { ParameterType, Renderer } = require("typedoc");

module.exports.load = function load(app) {
    app.options.addDeclaration({
        name: "plugin-option",
        help: "Displayed when --help is passed",
        type: ParameterType.String, // The default
        defaultValue: "", // The default
    });
    app.renderer.on(Renderer.EVENT_PREPARE_INDEX, (event) => {
        for (const [index, result] of event.searchResults.entries()) {
            // To see what is available on a event.searchResults element, see the reflections.json in the generated files
            event.searchFields[index].parameters = undefined;
            result.signatures?.forEach(signature => {
                signature.parameters?.forEach(param => {
                    if (param.type?.name) {
                        if (! event.searchFields[index].parameters) event.searchFields[index].parameters = '';
                        event.searchFields[index].parameters += `${param.type?.name}, `;
                    }
                });
                if (event.searchFields[index].parameters?.length > 0) {
                    event.searchFields[index].parameters = event.searchFields[index].parameters.slice(0,-2);
                }
            });
            //console.log('end of event', event.searchFields[index]);
        }
        // In order for a field to be taken into account by the index, it needs to be present in event.searchFieldWeights
        // https://github.com/TypeStrong/typedoc/blob/56813c0cb201f0c248a0cc43ef6e7578d680191c/src/lib/output/plugins/JavascriptIndexPlugin.ts#L89
        event.searchFieldWeights.parameters = 5;
    });
}
