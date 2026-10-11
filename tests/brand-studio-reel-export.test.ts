import { describe, test, expect } from 'bun:test';
import { ffmpegStoryboardArgs, parseStoryboardArgs } from '../scripts/studio/render-storyboard';

describe('manual rights-cleared reel export',()=>{
  test('rejects invalid inputs without accessing files',()=>{
    expect(()=>parseStoryboardArgs(['--output','bad.gif','a.png','b.png'])).toThrow();
    expect(()=>parseStoryboardArgs(['--output','ok.mp4','a.png'])).toThrow();
    expect(()=>parseStoryboardArgs(['--output','ok.mp4','--duration','1','a.png','b.png'])).toThrow();
    expect(()=>parseStoryboardArgs(['--output','ok.mp4','a.png','https://bad.example/image.jpg'])).toThrow();
  });
  test('constructs deterministic ffmpeg arguments without a shell',()=>{
    const input=parseStoryboardArgs(['--output','out.mp4','--duration','3','first.png','second.jpg']);
    const args=ffmpegStoryboardArgs(input);
    expect(args).toContain('libx264');
    expect(args).toContain('yuv420p');
    expect(args.join(' ')).toContain('concat=n=2:v=1:a=0');
    expect(args.filter(a=>a==='-i')).toHaveLength(2);
  });
});
