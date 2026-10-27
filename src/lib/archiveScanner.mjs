import {validBarcode} from './archiveBarcode.mjs';

async function loadDecoder(){
 const [{BrowserMultiFormatReader},{BarcodeFormat,DecodeHintType}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
 const hints=new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A]]]);
 const reader=new BrowserMultiFormatReader(hints,{delayBetweenScanAttempts:350});
 return {scan:(stream,video,onCode)=>reader.decodeFromStream(stream,video,result=>{if(result)onCode(result.getText());})};
}
/** A scan owns only its stream. Cancellation also covers a pending permission prompt. */
export function createArchiveScanner({video,onCode,onState=()=>{},getStream=constraints=>navigator.mediaDevices.getUserMedia(constraints),loadFallback=loadDecoder,Detector=globalThis.BarcodeDetector,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let generation=0,stream=null,controls=null,timer=null;
 const stopTracks=value=>{for(const track of value?.getTracks() || [])track.stop();};
 const state=value=>onState(value);
 function stop(){
  generation++;clearTimer(timer);timer=null;
  try{const stopped=controls?.stop();stopped?.catch?.(()=>{});}catch{/* Always release the owned stream even if a decoder cleanup fails. */}
  controls=null;stopTracks(stream);stream=null;
  video.pause?.();video.srcObject=null;video.hidden=true;state('stopped');
 }
 const accept=(raw,epoch)=>{
  if(epoch!==generation)return;
  const barcode=validBarcode(raw);if(!barcode)return;
  stop();onCode(barcode);
 };
 async function start(){
  stop();const epoch=generation;state('starting');
  try{
   let detector=null;
   if(Detector)try{const supported=await Detector.getSupportedFormats(),formats=['ean_13','ean_8','upc_a'].filter(format=>supported.includes(format));if(formats.length)detector=new Detector({formats});}catch{/* Native support varies by browser; use the software decoder. */}
   const fallback=detector?null:await loadFallback();if(epoch!==generation)return;
   const incoming=await getStream({video:{facingMode:{ideal:'environment'}},audio:false});
   if(epoch!==generation){stopTracks(incoming);return;}
   stream=incoming;video.srcObject=stream;video.hidden=false;await video.play();if(epoch!==generation)return;
   if(detector){
    const detect=async()=>{
     if(epoch!==generation)return;
     try{const codes=await detector.detect(video);for(const code of codes){accept(code.rawValue,epoch);if(epoch!==generation)return;}}catch{/* A frame without a code is not a camera failure. */}
     if(epoch===generation)timer=setTimer(detect,350);
    };
    state('active');void detect();
   }else{
    const handle=await fallback.scan(stream,video,raw=>accept(raw,epoch));
    if(epoch!==generation){handle.stop();return;}
    controls=handle;state('active');
   }
  }catch(error){if(epoch!==generation)return;stop();state('unavailable');return error;}
 }
 return {start,stop};
}
