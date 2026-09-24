import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference09} from './AriaHubReference09';

const fps = 30;
const durationInFrames = 405;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-09" component={AriaHubReference09} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-09-4K" component={AriaHubReference09} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
