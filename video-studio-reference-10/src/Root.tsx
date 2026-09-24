import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference10} from './AriaHubReference10';

const fps = 30;
const durationInFrames = 306;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-10" component={AriaHubReference10} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-10-4K" component={AriaHubReference10} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
