import React from 'react';
import {Composition} from 'remotion';
import {AriaHubReference} from './AriaHubReference';

const fps=30;
const durationInFrames=1356;

export const RemotionRoot:React.FC=()=>(
  <>
    <Composition id="ARIA-HUB-Reference-Recreation" component={AriaHubReference} durationInFrames={durationInFrames} fps={fps} width={1920} height={1080}/>
    <Composition id="ARIA-HUB-Reference-Recreation-4K" component={AriaHubReference} durationInFrames={durationInFrames} fps={fps} width={3840} height={2160}/>
  </>
);
