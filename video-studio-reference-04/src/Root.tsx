import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference04} from './AriaHubReference04';

const fps = 30;
const durationInFrames = 1107;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ARIA-HUB-Reference-04"
      component={AriaHubReference04}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1080}
      height={1920}
    />
    <Composition
      id="ARIA-HUB-Reference-04-4K"
      component={AriaHubReference04}
      durationInFrames={durationInFrames}
      fps={fps}
      width={2160}
      height={3840}
    />
  </>
);
