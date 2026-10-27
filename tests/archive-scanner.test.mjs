import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveScanner} from '../src/lib/archiveScanner.mjs';
const video=()=>({hidden:true,srcObject:null,play:async()=>{},pause:()=>{}});
const camera=()=>{let stopped=0;return {stream:{getTracks:()=>[{stop:()=>stopped++}]},stopped:()=>stopped};};
test('cancelling while camera permission is pending releases a later stream without scanning it',async()=>{
 let grant;const device=camera(),preview=video(),states=[],scanner=createArchiveScanner({video:preview,Detector:null,loadFallback:async()=>({scan:()=>{throw Error('cancelled scan started');}}),getStream:()=>new Promise(resolve=>grant=resolve),onState:state=>states.push(state),onCode:()=>assert.fail('cancelled scan')});
 const started=scanner.start();await new Promise(resolve=>setTimeout(resolve,0));scanner.stop();grant(device.stream);await started;
 assert.equal(device.stopped(),1);assert.equal(preview.srcObject,null);assert.equal(states.at(-1),'stopped');
});
test('software decoding preserves leading zeros, ignores invalid checksums and stops only its own camera',async()=>{
 let callback,stopped=0;const device=camera(),preview=video(),codes=[];
 const scanner=createArchiveScanner({video:preview,Detector:null,getStream:async()=>device.stream,loadFallback:async()=>({scan:async(_stream,_video,onCode)=>{callback=onCode;return {stop:()=>{stopped++;throw Error('decoder cleanup fixture');}};}}),onCode:code=>codes.push(code)});
 await scanner.start();callback('4901234567890');assert.equal(device.stopped(),0);callback('0036000291452');callback('4901234567894');
 assert.deepEqual(codes,['0036000291452']);assert.equal(stopped,1);assert.equal(device.stopped(),1);assert.equal(preview.hidden,true);
});
test('a synchronous decode before setup completes is stopped when late controls arrive',async()=>{
 let stopped=0;const device=camera(),codes=[],scanner=createArchiveScanner({video:video(),Detector:null,getStream:async()=>device.stream,loadFallback:async()=>({scan:async(_stream,_video,onCode)=>{onCode('4901234567894');return {stop:()=>stopped++};}}),onCode:code=>codes.push(code)});
 await scanner.start();assert.deepEqual(codes,['4901234567894']);assert.equal(stopped,1);assert.equal(device.stopped(),1);
});
test('unsupported native formats fall back to software; stop cancels native polling',async()=>{
 let fallback=0;const device=camera();
 class Unsupported{static async getSupportedFormats(){return ['qr_code'];}}
 const scanner=createArchiveScanner({video:video(),Detector:Unsupported,getStream:async()=>device.stream,loadFallback:async()=>{fallback++;return {scan:async()=>({stop(){}})};},onCode(){}});
 await scanner.start();assert.equal(fallback,1);scanner.stop();
 let pending=null,cancelled=0;
 class Native{static async getSupportedFormats(){return ['ean_13'];}async detect(){return [];}}
 const native=createArchiveScanner({video:video(),Detector:Native,getStream:async()=>device.stream,loadFallback:async()=>assert.fail('native available'),setTimer:fn=>{pending=fn;return 1;},clearTimer:()=>{cancelled++;pending=null;},onCode(){}});
 await native.start();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(typeof pending,'function');native.stop();assert.equal(pending,null);assert.ok(cancelled>=2);
});
