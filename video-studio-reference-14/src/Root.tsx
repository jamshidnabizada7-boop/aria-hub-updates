import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference14} from './AriaHubReference14';

const fps = 30;
const durationInFrames = 180;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-14" component={AriaHubReference14} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-14-4K" component={AriaHubReference14} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
