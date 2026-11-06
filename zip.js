/** Tiny UTF-8, uncompressed ZIP writer. No CDN or runtime dependencies. */
const encoder = new TextEncoder();
const table = Uint32Array.from({length:256},(_,n)=>{
  for(let bit=0;bit<8;bit++) n=(n&1)?0xedb88320^(n>>>1):n>>>1;
  return n>>>0;
});
export function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
export function zipFiles(files) {
  const locals=[],central=[];let offset=0,centralSize=0;
  for(const [name,content] of Object.entries(files)) {
    if(name.startsWith('/')||name.split('/').includes('..'))throw new Error('Invalid ZIP path');
    const filename=encoder.encode(name),data=encoder.encode(content),crc=crc32(data);
    const local=new Uint8Array(30+filename.length+data.length),l=new DataView(local.buffer);
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);
    l.setUint16(12,0x21,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,filename.length,true);
    local.set(filename,30);local.set(data,30+filename.length);locals.push(local);
    const entry=new Uint8Array(46+filename.length),c=new DataView(entry.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);
    c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,filename.length,true);c.setUint32(42,offset,true);entry.set(filename,46);
    central.push(entry);centralSize+=entry.length;offset+=local.length;
  }
  const end=new Uint8Array(22),view=new DataView(end.buffer);
  view.setUint32(0,0x06054b50,true);view.setUint16(8,central.length,true);view.setUint16(10,central.length,true);view.setUint32(12,centralSize,true);view.setUint32(16,offset,true);
  const result=new Uint8Array(offset+centralSize+end.length);let cursor=0;
  for(const chunk of [...locals,...central,end]){result.set(chunk,cursor);cursor+=chunk.length;}
  return result;
}
