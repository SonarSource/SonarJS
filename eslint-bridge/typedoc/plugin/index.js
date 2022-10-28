const { Application, ParameterType, Renderer, IndexEvent } = require("typedoc");

module.exports.load = function load(app) {

    console.log('weshyassin')

    app.options.addDeclaration({
        name: "plugin-option",
        help: "Displayed when --help is passed",
        type: ParameterType.String, // The default
        defaultValue: "", // The default
    });
    app.renderer.on(Renderer.EVENT_PREPARE_INDEX, (event) => {
        const parameters = [];
        //console.log('yo', event.searchResults.filter(e => e.type?.typeArguments != null && e.name?.contains('member')).slice(0,5).map(e => e));
        /* for (const result of event.searchResults) {
            console.log('wesh wehs yo2', result.type?.typeArguments. )
            result.typeParameters?.forEach(typeParam => {
                console.log(typeParam)
                if (typeParam.type) {
                    parameters.push(typeParam)
                }
            })
        } */

        //event.searchFields.push({ parameters: parameters.join('\n') })

    });
    app.renderer.on(Renderer.BEGIN, (event) => {
    });
}
