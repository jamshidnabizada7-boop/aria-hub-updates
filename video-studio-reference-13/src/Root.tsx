import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference13} from './AriaHubReference13';

const fps = 30;
const durationInFrames = 450;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-13" component={AriaHubReference13} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-13-4K" component={AriaHubReference13} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
