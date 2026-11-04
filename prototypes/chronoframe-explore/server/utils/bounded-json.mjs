export async function boundedJSON(response){
 const reader=response.body.getReader(),chunks=[];let size=0
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw new Error('Public page exceeds limit');chunks.push(value)}}catch(error){await reader.cancel();throw error}
 const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length}
 return JSON.parse(new TextDecoder().decode(bytes))
}
