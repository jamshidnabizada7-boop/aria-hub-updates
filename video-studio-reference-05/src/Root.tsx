import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference05} from './AriaHubReference05';

const fps = 30;
const durationInFrames = 336;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-05" component={AriaHubReference05} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-05-4K" component={AriaHubReference05} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
