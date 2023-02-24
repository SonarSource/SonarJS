/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from 'eslint';
import { rule } from 'linting/eslint/rules/no-intrusive-permissions';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

const defaultOptions = ['geolocation'];

ruleTester.run('', rule, {
  valid: [
    {
      code: `navigator.permissions.query({name:"foo"})`,
      options: defaultOptions,
    },
    {
      code: `param => navigator.permissions.query(param)`,
      options: defaultOptions,
    },
    {
      code: `navigator.permissions.query({other:"geolocation"})`,
      options: defaultOptions,
    },
    {
      code: `navigator.permissions.query({name:42})`,
      options: defaultOptions,
    },
    {
      code: `navigator.permissions.query({name:"microphone"})`,
      options: defaultOptions,
    },
    {
      code: `navigator.permissions.query({name:"foo"})`,
      options: ['foo'],
    },
    {
      code: `navigator.geolocation.watchPosition()`,
      options: ['camera'],
    },
    {
      code: `navigator.mediaDevices.getUserMedia()`,
      options: defaultOptions,
    },
    {
      code: `navigator.mediaDevices.getUserMedia({ audio: true })`,
      options: [],
    },
    {
      code: `param => navigator.mediaDevices.getUserMedia(param)`,
      options: ['camera'],
    },
    {
      code: `navigator.mediaDevices.getUserMedia({ other: true })`,
      options: ['camera'],
    },
    {
      code: `param => navigator.mediaDevices.getUserMedia({ ...param })`,
      options: ['camera'],
    },
    {
      code: `Notification.requestPermission()`,
      options: defaultOptions,
    },
    {
      code: `new Notification()`,
      options: defaultOptions,
    },
  ],
  invalid: [
    {
      code: `
      navigator.permissions.query({name:"geolocation"})
//                                 ^^^^^^^^^^^^^^^^^^`,
      options: defaultOptions,
      errors: [
        {
          message: 'Make sure the use of the geolocation is necessary.',
          line: 2,
          endLine: 2,
          column: 36,
          endColumn: 54,
        },
      ],
    },
    {
      code: `navigator.permissions.query({name: "camera"})`,
      options: ['camera'],
      errors: 1,
    },
    {
      code: `navigator.permissions.query({name: "microphone"})`,
      options: ['microphone'],
      errors: [
        {
          message: 'Make sure the use of the microphone is necessary.',
        },
      ],
    },
    {
      code: `navigator.permissions.query({name: "notifications"})`,
      options: ['notifications'],
      errors: 1,
    },
    {
      code: `navigator.permissions.query({name: "persistent-storage"})`,
      options: ['persistent-storage'],
      errors: 1,
    },
    {
      code: `
      navigator.geolocation.watchPosition()
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`,
      options: defaultOptions,
      errors: [
        {
          column: 7,
          endColumn: 42,
        },
      ],
    },
    {
      code: `navigator.geolocation.getCurrentPosition()`,
      options: defaultOptions,
      errors: 1,
    },
    {
      code: `
      navigator.mediaDevices.getUserMedia() // Compliant
      navigator.mediaDevices.getUserMedia({ audio: true, video: true }) // Sensitive for camera and microphone    
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }) // Sensitive for microphone      
      navigator.mediaDevices.getUserMedia({ audio: false, video: { /* something */} }) // Sensitive for camera only`,
      options: ['camera', 'microphone'],
      errors: [
        {
          message: 'Make sure the use of the microphone and camera is necessary.',
          line: 3,
        },
        {
          message: 'Make sure the use of the microphone is necessary.',
          line: 4,
        },
        {
          message: 'Make sure the use of the camera is necessary.',
          line: 5,
        },
      ],
    },
    {
      code: `Notification.requestPermission()`,
      options: ['notifications'],
      errors: 1,
    },
    {
      code: `new Notification()`,
      options: ['notifications'],
      errors: 1,
    },
    {
      code: `navigator.storage.persist()`,
      options: ['persistent-storage'],
      errors: 1,
    },
    {
      code: `navigator.storage.anyMethod()`,
      options: ['persistent-storage'],
      errors: 1,
    },
  ],
});
