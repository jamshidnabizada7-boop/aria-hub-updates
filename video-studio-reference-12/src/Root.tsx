import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference12} from './AriaHubReference12';

const fps = 30;
const durationInFrames = 540;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-12" component={AriaHubReference12} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-12-4K" component={AriaHubReference12} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
