import { debounce, throttle, memoize } from 'lodash';
import { debounce as debounceEs } from 'lodash-es';
import debounceMethod from 'lodash/debounce';
import _ from 'underscore';
import { useMemo, useCallback, useEffect } from 'react';

function Search() {
  const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                 ^^^^^^^^
  return null;
}

function VolumeControl() {
  const onScroll = throttle(updateVolume, 100); // Noncompliant {{This throttled function is recreated on every render, which resets its timer and defeats throttling. Move it outside the component or wrap it in useMemo.}}
//                 ^^^^^^^^
  return null;
}

function ActivityTracker() {
  const trackScroll = _.throttle(logScrollPosition, 100); // Noncompliant {{This throttled function is recreated on every render, which resets its timer and defeats throttling. Move it outside the component or wrap it in useMemo.}}
//                      ^^^^^^^^
  return null;
}

function DefaultImportComponent() {
  const handler = debounceMethod(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                ^^^^^^^^^^^^^^
  return null;
}

function LodashEsComponent() {
  const handler = debounceEs(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                ^^^^^^^^^^
  return null;
}

const ArrowComponent = () => {
  const onChange = debounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
//                 ^^^^^^^^
  return null;
};

const { debounce: requiredDebounce } = require('lodash');
const requiredLodash = require('lodash');

function RequireComponent() {
  const onChange = requiredDebounce(fetchResults, 300); // Noncompliant {{This debounced function is recreated on every render, which resets its timer and defeats debouncing. Move it outside the component or wrap it in useMemo.}}
  const onScroll = requiredLodash.throttle(updateVolume, 100); // Noncompliant {{This throttled function is recreated on every render, which resets its timer and defeats throttling. Move it outside the component or wrap it in useMemo.}}
//                                ^^^^^^^^
  return null;
}

const hoisted = debounce(fetchResults, 300);

function CompliantMemoized() {
  const onChange = useMemo(() => debounce(fetchResults, 300), []);
  const onScroll = useMemo(() => _.throttle(updateVolume, 100), []);
  return null;
}

function CompliantCallback() {
  const onChange = useCallback(debounce(fetchResults, 300), []);
  return null;
}

function CompliantComputed() {
  const onChange = _['debounce'](fetchResults, 300); // computed access is not resolved
  return null;
}

const shadowedUnderscore = { debounce: fn => fn };

function CompliantShadowed() {
  const onChange = shadowedUnderscore.debounce(fetchResults, 300); // local object, not a supported module
  return null;
}

function CompliantHoisted() {
  useEffect(() => {
    window.addEventListener('scroll', hoisted);
    return () => window.removeEventListener('scroll', hoisted);
  }, []);
  return null;
}

function CompliantHandler() {
  function handleClick() {
    const onChange = debounce(fetchResults, 300); // inside a nested function, not the component body
    onChange();
  }
  return null;
}

function CompliantEffect() {
  useEffect(() => {
    const onChange = debounce(fetchResults, 300);
    onChange();
  }, []);
  return null;
}

function notAComponent() {
  const onChange = debounce(fetchResults, 300); // lowercase: not a React component
  return onChange;
}

function MemoizeComponent() {
  const cached = memoize(computeValue); // memoize is out of scope
  return null;
}

function localDebounce(fn, wait) {
  return fn;
}

function LocalDebounceComponent() {
  const onChange = localDebounce(fetchResults, 300); // not a supported module
  return null;
}
