import { Application, ParameterType, Renderer, IndexEvent } from "typedoc";

export function load(app: Application) {
    app.options.addDeclaration({
        name: "plugin-option",
        help: "Displayed when --help is passed",
        type: ParameterType.String, // The default
        defaultValue: "", // The default
    });
    app.renderer.on(Renderer.EVENT_PREPARE_INDEX, (event: IndexEvent) => {
        event.searchFields.push()
        event.searchFieldWeights.parameters = 1
        event.searchFieldWeights.description = 1
    });
}
