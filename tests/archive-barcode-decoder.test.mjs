import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createRequire} from 'node:module';
const {MultiFormatReader,RGBLuminanceSource,HybridBinarizer,BinaryBitmap,DecodeHintType,BarcodeFormat}=createRequire(import.meta.url)('@zxing/library');
test('the installed ZXing decoder reads a synthetic EAN-13 fixture with the configured retail formats',async()=>{
 const {data,info}=await sharp('tests/fixtures/archive-ean13.png').greyscale().removeAlpha().raw().toBuffer({resolveWithObject:true});
 const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(new Uint8ClampedArray(data),info.width,info.height)));
 const reader=new MultiFormatReader(),hints=new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A]]]);
 assert.equal(reader.decode(bitmap,hints).getText(),'4901234567894');
 // The test code is not an assertion that any real archived item uses this barcode.
});
