import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference02} from './AriaHubReference02';

const fps = 30;
const durationInFrames = 780;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-02" component={AriaHubReference02} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-02-4K" component={AriaHubReference02} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
