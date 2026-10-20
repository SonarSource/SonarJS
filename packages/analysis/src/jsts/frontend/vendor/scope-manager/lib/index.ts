// THIS CODE WAS AUTOMATICALLY GENERATED
// DO NOT EDIT THIS CODE BY HAND
// RUN THE FOLLOWING COMMAND FROM THE WORKSPACE ROOT TO REGENERATE:
// node tools/sync-typescript-frontend.mjs /path/to/typescript-eslint

import type { LibDefinition } from '../variable/index.js';

import { decorators } from './decorators.js';
import { decorators_legacy } from './decorators.legacy.js';
import { dom } from './dom.js';
import { dom_asynciterable } from './dom.asynciterable.js';
import { dom_iterable } from './dom.iterable.js';
import { es5 } from './es5.js';
import { es6 } from './es6.js';
import { es7 } from './es7.js';
import { es2015 } from './es2015.js';
import { es2015_collection } from './es2015.collection.js';
import { es2015_core } from './es2015.core.js';
import { es2015_generator } from './es2015.generator.js';
import { es2015_iterable } from './es2015.iterable.js';
import { es2015_promise } from './es2015.promise.js';
import { es2015_proxy } from './es2015.proxy.js';
import { es2015_reflect } from './es2015.reflect.js';
import { es2015_symbol } from './es2015.symbol.js';
import { es2015_symbol_wellknown } from './es2015.symbol.wellknown.js';
import { es2016 } from './es2016.js';
import { es2016_array_include } from './es2016.array.include.js';
import { es2016_full } from './es2016.full.js';
import { es2016_intl } from './es2016.intl.js';
import { es2017 } from './es2017.js';
import { es2017_arraybuffer } from './es2017.arraybuffer.js';
import { es2017_date } from './es2017.date.js';
import { es2017_full } from './es2017.full.js';
import { es2017_intl } from './es2017.intl.js';
import { es2017_object } from './es2017.object.js';
import { es2017_sharedmemory } from './es2017.sharedmemory.js';
import { es2017_string } from './es2017.string.js';
import { es2017_typedarrays } from './es2017.typedarrays.js';
import { es2018 } from './es2018.js';
import { es2018_asyncgenerator } from './es2018.asyncgenerator.js';
import { es2018_asynciterable } from './es2018.asynciterable.js';
import { es2018_full } from './es2018.full.js';
import { es2018_intl } from './es2018.intl.js';
import { es2018_promise } from './es2018.promise.js';
import { es2018_regexp } from './es2018.regexp.js';
import { es2019 } from './es2019.js';
import { es2019_array } from './es2019.array.js';
import { es2019_full } from './es2019.full.js';
import { es2019_intl } from './es2019.intl.js';
import { es2019_object } from './es2019.object.js';
import { es2019_string } from './es2019.string.js';
import { es2019_symbol } from './es2019.symbol.js';
import { es2020 } from './es2020.js';
import { es2020_bigint } from './es2020.bigint.js';
import { es2020_date } from './es2020.date.js';
import { es2020_full } from './es2020.full.js';
import { es2020_intl } from './es2020.intl.js';
import { es2020_number } from './es2020.number.js';
import { es2020_promise } from './es2020.promise.js';
import { es2020_sharedmemory } from './es2020.sharedmemory.js';
import { es2020_string } from './es2020.string.js';
import { es2020_symbol_wellknown } from './es2020.symbol.wellknown.js';
import { es2021 } from './es2021.js';
import { es2021_full } from './es2021.full.js';
import { es2021_intl } from './es2021.intl.js';
import { es2021_promise } from './es2021.promise.js';
import { es2021_string } from './es2021.string.js';
import { es2021_weakref } from './es2021.weakref.js';
import { es2022 } from './es2022.js';
import { es2022_array } from './es2022.array.js';
import { es2022_error } from './es2022.error.js';
import { es2022_full } from './es2022.full.js';
import { es2022_intl } from './es2022.intl.js';
import { es2022_object } from './es2022.object.js';
import { es2022_regexp } from './es2022.regexp.js';
import { es2022_string } from './es2022.string.js';
import { es2023 } from './es2023.js';
import { es2023_array } from './es2023.array.js';
import { es2023_collection } from './es2023.collection.js';
import { es2023_full } from './es2023.full.js';
import { es2023_intl } from './es2023.intl.js';
import { es2024 } from './es2024.js';
import { es2024_arraybuffer } from './es2024.arraybuffer.js';
import { es2024_collection } from './es2024.collection.js';
import { es2024_full } from './es2024.full.js';
import { es2024_object } from './es2024.object.js';
import { es2024_promise } from './es2024.promise.js';
import { es2024_regexp } from './es2024.regexp.js';
import { es2024_sharedmemory } from './es2024.sharedmemory.js';
import { es2024_string } from './es2024.string.js';
import { es2025 } from './es2025.js';
import { es2025_collection } from './es2025.collection.js';
import { es2025_float16 } from './es2025.float16.js';
import { es2025_full } from './es2025.full.js';
import { es2025_intl } from './es2025.intl.js';
import { es2025_iterator } from './es2025.iterator.js';
import { es2025_promise } from './es2025.promise.js';
import { es2025_regexp } from './es2025.regexp.js';
import { esnext } from './esnext.js';
import { esnext_array } from './esnext.array.js';
import { esnext_asynciterable } from './esnext.asynciterable.js';
import { esnext_bigint } from './esnext.bigint.js';
import { esnext_collection } from './esnext.collection.js';
import { esnext_date } from './esnext.date.js';
import { esnext_decorators } from './esnext.decorators.js';
import { esnext_disposable } from './esnext.disposable.js';
import { esnext_error } from './esnext.error.js';
import { esnext_float16 } from './esnext.float16.js';
import { esnext_full } from './esnext.full.js';
import { esnext_intl } from './esnext.intl.js';
import { esnext_iterator } from './esnext.iterator.js';
import { esnext_object } from './esnext.object.js';
import { esnext_promise } from './esnext.promise.js';
import { esnext_regexp } from './esnext.regexp.js';
import { esnext_sharedmemory } from './esnext.sharedmemory.js';
import { esnext_string } from './esnext.string.js';
import { esnext_symbol } from './esnext.symbol.js';
import { esnext_temporal } from './esnext.temporal.js';
import { esnext_typedarrays } from './esnext.typedarrays.js';
import { esnext_weakref } from './esnext.weakref.js';
import { lib as libBase } from './lib.js';
import { scripthost } from './scripthost.js';
import { webworker } from './webworker.js';
import { webworker_asynciterable } from './webworker.asynciterable.js';
import { webworker_importscripts } from './webworker.importscripts.js';
import { webworker_iterable } from './webworker.iterable.js';

export const lib: ReadonlyMap<string, LibDefinition> = new Map<string, LibDefinition>([
  ['es5', es5],
  ['es6', es6],
  ['es2015', es2015],
  ['es7', es7],
  ['es2016', es2016],
  ['es2017', es2017],
  ['es2018', es2018],
  ['es2019', es2019],
  ['es2020', es2020],
  ['es2021', es2021],
  ['es2022', es2022],
  ['es2023', es2023],
  ['es2024', es2024],
  ['es2025', es2025],
  ['esnext', esnext],
  ['dom', dom],
  ['dom.iterable', dom_iterable],
  ['dom.asynciterable', dom_asynciterable],
  ['webworker', webworker],
  ['webworker.importscripts', webworker_importscripts],
  ['webworker.iterable', webworker_iterable],
  ['webworker.asynciterable', webworker_asynciterable],
  ['scripthost', scripthost],
  ['es2015.core', es2015_core],
  ['es2015.collection', es2015_collection],
  ['es2015.generator', es2015_generator],
  ['es2015.iterable', es2015_iterable],
  ['es2015.promise', es2015_promise],
  ['es2015.proxy', es2015_proxy],
  ['es2015.reflect', es2015_reflect],
  ['es2015.symbol', es2015_symbol],
  ['es2015.symbol.wellknown', es2015_symbol_wellknown],
  ['es2016.array.include', es2016_array_include],
  ['es2016.intl', es2016_intl],
  ['es2017.arraybuffer', es2017_arraybuffer],
  ['es2017.date', es2017_date],
  ['es2017.object', es2017_object],
  ['es2017.sharedmemory', es2017_sharedmemory],
  ['es2017.string', es2017_string],
  ['es2017.intl', es2017_intl],
  ['es2017.typedarrays', es2017_typedarrays],
  ['es2018.asyncgenerator', es2018_asyncgenerator],
  ['es2018.asynciterable', es2018_asynciterable],
  ['es2018.intl', es2018_intl],
  ['es2018.promise', es2018_promise],
  ['es2018.regexp', es2018_regexp],
  ['es2019.array', es2019_array],
  ['es2019.object', es2019_object],
  ['es2019.string', es2019_string],
  ['es2019.symbol', es2019_symbol],
  ['es2019.intl', es2019_intl],
  ['es2020.bigint', es2020_bigint],
  ['es2020.date', es2020_date],
  ['es2020.promise', es2020_promise],
  ['es2020.sharedmemory', es2020_sharedmemory],
  ['es2020.string', es2020_string],
  ['es2020.symbol.wellknown', es2020_symbol_wellknown],
  ['es2020.intl', es2020_intl],
  ['es2020.number', es2020_number],
  ['es2021.promise', es2021_promise],
  ['es2021.string', es2021_string],
  ['es2021.weakref', es2021_weakref],
  ['es2021.intl', es2021_intl],
  ['es2022.array', es2022_array],
  ['es2022.error', es2022_error],
  ['es2022.intl', es2022_intl],
  ['es2022.object', es2022_object],
  ['es2022.string', es2022_string],
  ['es2022.regexp', es2022_regexp],
  ['es2023.array', es2023_array],
  ['es2023.collection', es2023_collection],
  ['es2023.intl', es2023_intl],
  ['es2024.arraybuffer', es2024_arraybuffer],
  ['es2024.collection', es2024_collection],
  ['es2024.object', es2024_object],
  ['es2024.promise', es2024_promise],
  ['es2024.regexp', es2024_regexp],
  ['es2024.sharedmemory', es2024_sharedmemory],
  ['es2024.string', es2024_string],
  ['es2025.collection', es2025_collection],
  ['es2025.float16', es2025_float16],
  ['es2025.intl', es2025_intl],
  ['es2025.iterator', es2025_iterator],
  ['es2025.promise', es2025_promise],
  ['es2025.regexp', es2025_regexp],
  ['esnext.asynciterable', esnext_asynciterable],
  ['esnext.symbol', esnext_symbol],
  ['esnext.bigint', esnext_bigint],
  ['esnext.weakref', esnext_weakref],
  ['esnext.object', esnext_object],
  ['esnext.regexp', esnext_regexp],
  ['esnext.string', esnext_string],
  ['esnext.float16', esnext_float16],
  ['esnext.iterator', esnext_iterator],
  ['esnext.promise', esnext_promise],
  ['esnext.array', esnext_array],
  ['esnext.collection', esnext_collection],
  ['esnext.date', esnext_date],
  ['esnext.decorators', esnext_decorators],
  ['esnext.disposable', esnext_disposable],
  ['esnext.error', esnext_error],
  ['esnext.intl', esnext_intl],
  ['esnext.sharedmemory', esnext_sharedmemory],
  ['esnext.temporal', esnext_temporal],
  ['esnext.typedarrays', esnext_typedarrays],
  ['decorators', decorators],
  ['decorators.legacy', decorators_legacy],
  ['es2016.full', es2016_full],
  ['es2017.full', es2017_full],
  ['es2018.full', es2018_full],
  ['es2019.full', es2019_full],
  ['es2020.full', es2020_full],
  ['es2021.full', es2021_full],
  ['es2022.full', es2022_full],
  ['es2023.full', es2023_full],
  ['es2024.full', es2024_full],
  ['es2025.full', es2025_full],
  ['esnext.full', esnext_full],
  ['lib', libBase],
]);
