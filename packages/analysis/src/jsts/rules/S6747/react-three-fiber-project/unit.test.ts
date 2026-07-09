/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from '../rule.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6747', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6747 ignores props on reviewed React Three Fiber intrinsic elements', rule, {
    valid: [
      {
        code: `import { Canvas } from '@react-three/fiber';
<Canvas>
  <ambientLight intensity={0.4} />
  <pointLight position={[1, 2, 3]} distance={10} color="white" />
</Canvas>;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        code: `import { Canvas } from '@react-three/fiber';
<Canvas>
  <mesh position={[1, 2, 3]} rotation-x={1}>
    <boxGeometry args={[1, 1, 1]} />
    <circleGeometry args={[3.5, 64]} />
    <meshStandardMaterial color="hotpink" transparent />
  </mesh>
</Canvas>;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        code: `import { Canvas } from '@react-three/fiber';
const uniforms = { time: { value: 0 } };
const vertexShader = 'void main() {}';
const fragmentShader = 'void main() {}';
<Canvas>
  <shaderMaterial
    uniforms={uniforms}
    vertexShader={vertexShader}
    fragmentShader={fragmentShader}
    transparent
  />
</Canvas>;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        code: `<meshBasicMaterial wireframe />;`,
        filename: join(dirname, 'filename.jsx'),
      },
    ],
    invalid: [
      {
        code: `<div intensity={1} />;`,
        filename: join(dirname, 'filename.jsx'),
        errors: 1,
      },
      {
        code: `<span transparent />;`,
        filename: join(dirname, 'filename.jsx'),
        errors: 1,
      },
      {
        code: `<img position={[1, 2, 3]} />;`,
        filename: join(dirname, 'filename.jsx'),
        errors: 1,
      },
    ],
  });
});
