#!/usr/bin/env bun
/**
 * Local, deterministic, rights-cleared storyboard -> MP4 exporter.
 * No network requests, no AI-generation calls, no social publishing.
 *
 * Usage:
 * bun scripts/studio/render-storyboard.ts --output /tmp/aria-reel.mp4 \
 *   --duration 4 /absolute/scene1.png /absolute/scene2.png /absolute/scene3.png
 *
 * Requires ffmpeg installed in PATH. All input scenes should be approved,
 * portrait 9:16 frames. This is a straightforward animated slide reel, not
 * a generated cinematic motion picture.
 */
import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';

type Args = { output: string; frames: string[]; duration: number; ffmpeg: string };
export function parseStoryboardArgs(argv: string[]): Args {
  const frames: string[] = [];
  let output = '';
  let duration = 4;
  let ffmpeg = 'ffmpeg';
  for (let i=0;i<argv.length;i++) {
    const token=argv[i];
    if (token==='--output') output=argv[++i]??'';
    else if (token==='--duration') duration=Number(argv[++i]);
    else if (token==='--ffmpeg') ffmpeg=argv[++i]??'';
    else if (token.startsWith('--')) throw new Error('Unknown argument: '+token);
    else frames.push(token);
  }
  if (!output || extname(output).toLowerCase()!=='.mp4') throw new Error('Output must be an .mp4 file');
  if (!Number.isInteger(duration)||duration<2||duration>12) throw new Error('Duration must be an integer between 2 and 12 seconds per frame');
  if (frames.length<2||frames.length>12) throw new Error('Supply 2-12 approved PNG/JPEG scenes');
  if (frames.some(f=>/^\w+:\/\//.test(f) || !['.png','.jpg','.jpeg'].includes(extname(f).toLowerCase()))) throw new Error('Only local PNG and JPEG frames are allowed');
  return { output:resolve(output), frames:frames.map(frame=>resolve(frame)), duration, ffmpeg };
}

export function ffmpegStoryboardArgs(input:Args):string[] {
  const args:string[] = ['-hide_banner','-loglevel','error','-y'];
  for(const frame of input.frames)args.push('-loop','1','-framerate','30','-t',String(input.duration),'-i',frame);
  const transitions: string[] = [];
  // Pixel-format conversion, deterministic scaling and subtle vignette. Scenes
  // are encoded separately and concatenated so precise slide timings survive.
  for(let i=0;i<input.frames.length;i++){
    transitions.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x121b35,format=yuv420p,setsar=1[v${i}]`);
  }
  transitions.push(input.frames.map((_,i)=>`[v${i}]`).join('')+`concat=n=${input.frames.length}:v=1:a=0[out]`);
  return [...args,'-filter_complex',transitions.join(';'),'-map','[out]','-r','30','-c:v','libx264','-preset','veryfast','-crf','21','-movflags','+faststart','-pix_fmt','yuv420p',input.output];
}

export async function renderStoryboard(argv:string[]) {
  const input=parseStoryboardArgs(argv);
  for(const f of input.frames) await access(f);
  await mkdir(dirname(input.output),{recursive:true});
  await new Promise<void>((ok,fail)=>{
    const process=spawn(input.ffmpeg,ffmpegStoryboardArgs(input),{stdio:'inherit',shell:false});
    process.on('error',fail);
    process.on('close',code=>code===0?ok():fail(new Error('ffmpeg exited with '+code)));
  });
  return input.output;
}

if(import.meta.main){
  renderStoryboard(process.argv.slice(2))
    .then(path=>process.stdout.write('Created MP4: '+path+'\n'))
    .catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1;});
}
