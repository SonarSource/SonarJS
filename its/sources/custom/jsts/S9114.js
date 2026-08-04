import { debounce } from 'lodash';
import _ from 'underscore';
import { useMemo, useEffect } from 'react';

const DELAY = 300;
const INTERVAL = 100;

function fetchResults() {
  return [];
}

function logScrollPosition() {
  return window.scrollY;
}

function Search() {
  const onChange = debounce(fetchResults, DELAY);
  return <input onChange={onChange} />;
}

function CompliantSearch() {
  const onChange = useMemo(() => debounce(fetchResults, DELAY), []);
  return <input onChange={onChange} />;
}

function ActivityTracker() {
  const trackScroll = _.throttle(logScrollPosition, INTERVAL);
  useEffect(() => {
    window.addEventListener('scroll', trackScroll);
    return () => window.removeEventListener('scroll', trackScroll);
  });
  return <main>{/* content */}</main>;
}

const throttledTrackScroll = _.throttle(logScrollPosition, INTERVAL);

function CompliantActivityTracker() {
  useEffect(() => {
    window.addEventListener('scroll', throttledTrackScroll);
    return () => window.removeEventListener('scroll', throttledTrackScroll);
  });
  return <main>{/* content */}</main>;
}

export { Search, CompliantSearch, ActivityTracker, CompliantActivityTracker };
