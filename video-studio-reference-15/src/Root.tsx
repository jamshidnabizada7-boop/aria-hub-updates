import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference15} from './AriaHubReference15';

const fps=30;
const durationInFrames=510;

export const RemotionRoot:React.FC=()=> <>
  <Composition id="ARIA-HUB-Reference-15" component={AriaHubReference15} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
  <Composition id="ARIA-HUB-Reference-15-4K" component={AriaHubReference15} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
</>;
