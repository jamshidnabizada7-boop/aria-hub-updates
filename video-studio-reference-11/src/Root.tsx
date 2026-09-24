import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference11} from './AriaHubReference11';

const fps = 30;
const durationInFrames = 630;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-11" component={AriaHubReference11} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-11-4K" component={AriaHubReference11} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
