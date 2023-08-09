function Component() {
    function UnstableNestedComponent() { // Noncompliant {{Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “Component” and pass data as props.}}
        return <div />;
    }
    return (
        <div>
            <UnstableNestedComponent />
        </div>
    );
}

function SomeComponent({ footer: Footer }) {
    return (
        <div>
            <Footer />
        </div>
    );
}

function Component() {
    return (
        <div>
            <SomeComponent footer={ () => <div /> } /> { /* Noncompliant {{Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “Component” and pass data as props. If you want to allow component creation in props, set allowAsProps option to true.}} */ }
        </div>
    );
}

class Component extends React.Component {
    render() {
        function UnstableNestedComponent() { { /* Noncompliant {{Do not define components during render. React will see a new component type on every render and destroy the entire subtree’s DOM nodes and state. Instead, move this component definition out of the parent component “Component” and pass data as props.}} */ }
            return <div />;
        }

        return (
            <div>
                <UnstableNestedComponent />
            </div>
        );
    }
}

