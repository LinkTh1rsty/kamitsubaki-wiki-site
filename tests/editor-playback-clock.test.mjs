import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createEditorPlaybackClock, loadYouTubeIframeAPI, sampleEditorPlayback, youtubeEditorEmbedUrl } from '../src/lib/editorPlaybackClock.mjs';
import { loadPreviewMedia } from '../src/lib/editorPreview.mjs';
import { formatLyricTimestamp } from '../src/lib/editorLyrics.mjs';

test('editor YouTube URL enables only the documented API parameters for a safe embed', () => {
  const source='https://www.youtube-nocookie.com/embed/3Wtx6k2vInU';
  const url=new URL(youtubeEditorEmbedUrl(source,'http://localhost:4322'));
  assert.equal(url.host,'www.youtube-nocookie.com');
  assert.equal(url.searchParams.get('enablejsapi'),'1');
  assert.equal(url.searchParams.get('origin'),'http://localhost:4322');
  for(const unsafe of ['https://evil.example/embed/3Wtx6k2vInU','javascript:alert(1)','https://www.youtube.com/watch/3Wtx6k2vInU'])
    assert.equal(youtubeEditorEmbedUrl(unsafe,'http://localhost:4322'),null);
  assert.equal(youtubeEditorEmbedUrl(source,'javascript:alert(1)'),null);
});

test('activating an editor preview adds API parameters only to its YouTube iframe', () => {
  const previousDocument=globalThis.document;
  let iframe,inserted;
  globalThis.document={createElement(tag){
    assert.equal(tag,'template');
    return {content:{get firstElementChild(){return {dataset:{mediaProvider:'youtube'},querySelector:()=>iframe};}},set innerHTML(html){
      const src=html.match(/<iframe src="([^"]+)"/)?.[1];
      assert.ok(src);
      iframe={src,getAttribute(){return this.src;},setAttribute(_key,value){this.src=value;}};
    }};
  }};
  const button={dataset:{provider:'youtube',url:'https://youtu.be/3Wtx6k2vInU'},closest(){return {replaceWith(content){inserted=content;}};}};
  try {
    const figure=loadPreviewMedia(button,{youtubeApi:true,origin:'http://localhost:4322'});
    assert.ok(figure);
    assert.ok(inserted);
    const url=new URL(iframe.src);
    assert.equal(url.searchParams.get('enablejsapi'),'1');
    assert.equal(url.searchParams.get('origin'),'http://localhost:4322');
    const bilibili={...button,dataset:{provider:'bilibili',url:'BV1CJ411b7Ym'}};
    loadPreviewMedia(bilibili);
    assert.equal(new URL(iframe.src).searchParams.get('enablejsapi'),null);
  } finally { globalThis.document=previousDocument; }
});

test('lyric time comes from a playing media element or YouTube player, never a paused or failed embed', () => {
  const native={paused:false,ended:false,currentTime:12.345,isConnected:true};
  const youtube={iframe:{isConnected:true},player:{getPlayerState:()=>1,getCurrentTime:()=>83.456}};
  assert.equal(formatLyricTimestamp(sampleEditorPlayback([native],[],null).seconds),'00:12.35');
  assert.equal(formatLyricTimestamp(sampleEditorPlayback([],[youtube],null).seconds),'01:23.46');
  assert.equal(sampleEditorPlayback([native],[youtube],native).source,'html5');
  assert.equal(sampleEditorPlayback([native],[youtube],youtube.player).source,'youtube');
  native.paused=true;
  assert.equal(sampleEditorPlayback([native],[],null),null);
  youtube.player.getPlayerState=()=>2;
  assert.equal(sampleEditorPlayback([],[youtube],null),null);
  youtube.player.getPlayerState=()=>{throw Error('detached iframe');};
  assert.equal(sampleEditorPlayback([],[youtube],null),null);
  native.paused=false;native.currentTime=Number.NaN;
  assert.equal(sampleEditorPlayback([native],[],null),null);
});

test('YouTube IFrame API is lazy, shared, and restores an existing readiness callback', async () => {
  const scripts=[];
  let previousCalls=0;
  const previous=()=>{previousCalls++;};
  const win={onYouTubeIframeAPIReady:previous,setTimeout,clearTimeout};
  const doc={head:{append(script){scripts.push(script);}},createElement(tag){assert.equal(tag,'script');return {};}};
  const first=loadYouTubeIframeAPI(win,doc,{timeoutMs:1000});
  const second=loadYouTubeIframeAPI(win,doc,{timeoutMs:1000});
  assert.equal(first,second);
  assert.equal(scripts.length,1);
  assert.equal(scripts[0].src,'https://www.youtube.com/iframe_api');
  win.YT={Player:function Player(){}};
  win.onYouTubeIframeAPIReady();
  assert.equal(await first,win.YT);
  assert.equal(previousCalls,1);
  assert.equal(win.onYouTubeIframeAPIReady,previous);
});

test('failed YouTube API download can retry without leaving its callback or timer behind', async () => {
  const scripts=[];
  const previous=()=>{};
  let timerClears=0;
  const win={onYouTubeIframeAPIReady:previous,setTimeout,clearTimeout(id){timerClears++;clearTimeout(id);}};
  const doc={head:{append(script){scripts.push(script);}},createElement(){return {remove(){this.removed=true;}};}};
  const first=loadYouTubeIframeAPI(win,doc,{timeoutMs:1000});
  scripts[0].onerror();
  await assert.rejects(first,/youtube-api-network/);
  assert.equal(scripts[0].removed,true);
  assert.equal(win.onYouTubeIframeAPIReady,previous);
  assert.equal(timerClears,1);
  const retry=loadYouTubeIframeAPI(win,doc,{timeoutMs:1000});
  assert.equal(scripts.length,2);
  scripts[1].onerror();
  await assert.rejects(retry,/youtube-api-network/);
});

test('controller samples its activated YouTube figure and keeps unsupported services manual', async () => {
  const listeners=new Map(),status=[];
  const root={addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);},querySelectorAll(){return [];}};
  const iframe={isConnected:true,getAttribute:()=>youtubeEditorEmbedUrl('https://www.youtube-nocookie.com/embed/3Wtx6k2vInU','http://localhost:4322')};
  let player,ytEvents;
  const win={location:{origin:'http://localhost:4322'},setTimeout,clearTimeout,YT:{Player:function Player(_iframe,options){
    ytEvents=options.events;
    player={getPlayerState:()=>1,getCurrentTime:()=>42.75,getIframe:()=>iframe,destroy(){this.destroyed=true;}};
    queueMicrotask(()=>{options.events.onReady({target:player});options.events.onStateChange({data:1,target:player});});
    return player;
  }}};
  const clock=createEditorPlaybackClock(root,{win,doc:{},onStatus:value=>status.push(value)});
  assert.equal(await clock.registerFigure({dataset:{mediaProvider:'bilibili'},querySelector:()=>iframe}),false);
  assert.equal(status.at(-1),'manual');
  assert.equal(clock.sample(),null);
  const figure={dataset:{mediaProvider:'youtube'},querySelector:()=>iframe};
  const first=clock.registerFigure(figure);
  assert.equal(clock.registerFigure(figure),first,'one figure has one player registration');
  assert.equal(await first,true);
  assert.equal(clock.sample().seconds,42.75);
  assert.equal(status.at(-1),'ready');
  ytEvents.onError();
  assert.equal(status.at(-1),'unavailable');
  clock.dispose();
  assert.equal(player.destroyed,true);
  assert.equal(listeners.size,0);
});

test('the most recently played native medium wins until the YouTube player plays again', async () => {
  const listeners=new Map(),native={paused:false,ended:false,currentTime:9,isConnected:true,matches:()=>true};
  const root={addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);},querySelectorAll(){return [native];}};
  const iframe={isConnected:true,getAttribute:()=>youtubeEditorEmbedUrl('https://www.youtube.com/embed/3Wtx6k2vInU','http://localhost:4322')};
  let ytEvents;
  const player={getPlayerState:()=>1,getCurrentTime:()=>75,getIframe:()=>iframe,destroy(){}};
  const win={location:{origin:'http://localhost:4322'},setTimeout,clearTimeout,YT:{Player:function Player(_iframe,{events}){ytEvents=events;queueMicrotask(()=>events.onReady({target:player}));return player;}}};
  const clock=createEditorPlaybackClock(root,{win,doc:{}});
  assert.equal(await clock.registerFigure({dataset:{mediaProvider:'youtube'},querySelector:()=>iframe}),true);
  assert.equal(clock.sample().source,'youtube');
  listeners.get('play')({target:native});
  assert.equal(clock.sample().source,'html5');
  ytEvents.onStateChange({data:1,target:player});
  assert.equal(clock.sample().source,'youtube');
  clock.dispose();
});

test('route disposal cancels a YouTube player waiting for ready', async () => {
  const root={addEventListener(){},removeEventListener(){},querySelectorAll(){return [];}};
  const iframe={isConnected:true,getAttribute:()=>youtubeEditorEmbedUrl('https://www.youtube.com/embed/3Wtx6k2vInU','http://localhost:4322')};
  let player;
  const win={location:{origin:'http://localhost:4322'},setTimeout,clearTimeout,YT:{Player:function Player(){player={destroy(){this.destroyed=true;}};return player;}}};
  const clock=createEditorPlaybackClock(root,{win,doc:{}});
  const registration=clock.registerFigure({dataset:{mediaProvider:'youtube'},querySelector:()=>iframe});
  await Promise.resolve();
  clock.dispose();
  assert.equal(await registration,false);
  assert.equal(player.destroyed,true);
});
