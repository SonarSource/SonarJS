function Component1() {
    function NestedComponent1() { // Noncompliant {{Move this component definition out of the parent component and pass data as props.}}
//           ^^^^^^^^^^^^^^^^
        return <div />;
    }
    return (
        <div>
            <NestedComponent1 />
        </div>
    );
}

function Component2() {
    class NestedComponent2 extends React.Component { // Noncompliant
//        ^^^^^^^^^^^^^^^^
        render() {
            return <div />;
        }
    };

    return (
      <div>
        <NestedComponent2 />
      </div>
    );
}
