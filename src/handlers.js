import {
  axioscanFreeHandler,
  axioscanPremiumHandler,
} from './utils/axioscan.js';

export const SOURCE_NAMES = {
  '-1002485914699': 'AXIOSCAN',
};

export const HANDLERS = {
  '-1002485914699': ({ sourceName, text }) => {
    const premiumOut = axioscanPremiumHandler({ sourceName, text });
    if (premiumOut) return premiumOut;

    return axioscanFreeHandler({ sourceName, text });
  },
};
