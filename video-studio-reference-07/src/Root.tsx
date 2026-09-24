import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference07} from './AriaHubReference07';

const fps = 30;
const durationInFrames = 1477;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ARIA-HUB-Reference-07" component={AriaHubReference07} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-07-4K" component={AriaHubReference07} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
