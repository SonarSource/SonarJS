import { Canvas } from '@react-three/fiber';

<div class="foo"></div>; // Noncompliant [[qf1]] {{Unknown property 'class' found, use 'className' instead}}
//   ^^^^^^^^^^^
// fix@qf1 {{Replace with 'className'}}
// edit@qf1 [[sc=0;ec=24]] {{<div className="foo"></div>;}}
<div aria-foo="bar"></div>; // Noncompliant {{aria-foo: This attribute is an invalid ARIA attribute.}}
<img src="foo.png" />;

<Canvas>
  <ambientLight intensity={0.4} />
  <pointLight position={[4, 4, 4]} distance={10} color="#ffcc88" />
  <mesh position={[1, 2, 3]} rotation-x={1}>
    <boxGeometry args={[1, 1, 1]} />
    <circleGeometry args={[3.5, 64]} />
    <meshStandardMaterial color="hotpink" transparent />
    <shaderMaterial
      uniforms={{ time: { value: 0 } }}
      fragmentShader="void main() {}"
      vertexShader="void main() {}"
      transparent
    />
  </mesh>
</Canvas>;

<div intensity={1} />; // Noncompliant {{Unknown property 'intensity' found}}
<span transparent />; // Noncompliant {{Unknown property 'transparent' found}}
<img position={[1, 2, 3]} />; // Noncompliant {{Unknown property 'position' found}}

// All props on a recognized React Three Fiber intrinsic element are accepted, even ones outside
// three.js' documented surface: no-unknown-property does not validate three.js objects. Typos and
// misplaced props are left to react-three-fiber's runtime warnings and TypeScript's ThreeElements types.
<mesh castShadow receiveShadow visible={false} frustumCulled={false} renderOrder={1} />;
<mesh transparnt />;
<mesh intensity={1} />;
<ambientLight vertexShader="void main() {}" />;
<boxGeometry transparent />;

// Namespaced (colon) attribute names are not valid R3F props and still report.
<mesh position:x={1} />; // Noncompliant {{Unknown property 'position:x' found}}
