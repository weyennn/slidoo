import type { OpenSlideConfig } from '@open-slide/core';

const openSlideConfig: OpenSlideConfig = {
  // Override at build time with OPEN_SLIDE_BASE, e.g. /slidoo/.
  base: process.env.OPEN_SLIDE_BASE || '/',
};

export default openSlideConfig;
