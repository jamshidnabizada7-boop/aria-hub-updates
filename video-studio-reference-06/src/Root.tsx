import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference06} from './AriaHubReference06';

const fps = 30;
const durationInFrames = 480;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-06" component={AriaHubReference06} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-06-4K" component={AriaHubReference06} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
