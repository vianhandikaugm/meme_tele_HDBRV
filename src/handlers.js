import {
  axioscanFreeHandler,
  axioscanPremiumHandler,
} from './utils/axioscan.js';
import { villaninousHatHandler } from './utils/villaninoushat.js';
import { cHubAlertsHandler } from './utils/chubalerts.js';

export const SOURCE_NAMES = {
  '-1002485914699': 'AXIOSCAN',
  '-1001835601798': 'VILLANINOUS_HAT',
  '-1003129224359': 'C_HUB_ALERTS',
};

export const HANDLERS = {
  '-1002485914699': ({ sourceName, text }) => {
    const premiumOut = axioscanPremiumHandler({ sourceName, text });
    if (premiumOut) return premiumOut;

    return axioscanFreeHandler({ sourceName, text });
  },

  '-1001835601798': ({ sourceName, text }) =>
    villaninousHatHandler({ sourceName, text }),

  '-1003129224359': ({ sourceName, text }) =>
    cHubAlertsHandler({ sourceName, text }),
};
