import * as amplitude from '@amplitude/analytics-browser';
import { browser } from '$app/environment';

const API_KEY = 'b5c164d237348f74c9f2822da40cc1ac';
let initialized = false;

export function initAnalytics() {
  if (!browser || initialized) return;
  let userId = localStorage.getItem('hc_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('hc_user_id', userId);
  }
  amplitude.init(API_KEY, userId, { autocapture: true });
  initialized = true;
}

export function track(event, props) {
  if (!browser) return;
  amplitude.track(event, props);
}
