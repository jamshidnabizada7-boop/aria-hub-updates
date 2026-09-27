import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference08} from './AriaHubReference08';

const fps = 30;
const durationInFrames = 1308;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-08" component={AriaHubReference08} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-08-4K" component={AriaHubReference08} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
