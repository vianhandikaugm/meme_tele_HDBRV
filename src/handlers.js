import { axioscanFreeHandler } from './utils/axioscan.js';
import { villaninousHatHandler } from './utils/villaninoushat.js';
import { cHubAlertsHandler } from './utils/chubalerts.js';
import { diamondDegensHandler } from './utils/diamonddegens.js';

export const SOURCE_NAMES = {
  '-1002485914699': 'AXIOSCAN_FREE',
  '-1003129224359': 'C_HUB_ALERTS',
  '-1001835601798': 'VILLANINOUS_HAT',
  '-1002482272712': 'DIAMOND_DEGENS',
};

export const HANDLERS = {
  '-1002485914699': ({ sourceName, text }) =>
    axioscanFreeHandler({ sourceName, text }),

  '-1001835601798': ({ sourceName, text }) =>
    villaninousHatHandler({ sourceName, text }),

  '-1003129224359': ({ sourceName, text }) =>
    cHubAlertsHandler({ sourceName, text }),

  '-1002482272712': ({ sourceName, text }) =>
    diamondDegensHandler({ sourceName, text }),
};
