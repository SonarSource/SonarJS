/*
This script is used to generate protobuf stubs to create UCFGs in JavaScript/TypeScript
It's written in JS so build is portable to windows/linux/mac platforms
 */

const mkdirp = require('mkdirp');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

mkdirp.sync('dist');
mkdirp.sync('generated');

const protoPath = path.join(__dirname, 'output');
const protoFile = path.join(protoPath, 'estree.proto');

const tsPluginName = os.platform() === 'win32' ? 'protoc-gen-ts.cmd' : 'protoc-gen-ts';
const tsPluginPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', tsPluginName);
const tsPlugin = `--plugin=protoc-gen-ts=${tsPluginPath} --ts_out=./generated`;
const jsPlugin = ''; //'--js_out=import_style=commonjs,binary:./generated';

execSync(`protoc ${tsPlugin} ${jsPlugin} --proto_path=${protoPath} ${protoFile}`);
