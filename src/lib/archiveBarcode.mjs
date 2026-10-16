/** GTIN-8 / UPC-A / EAN-13 / GTIN-14 checksum. A valid checksum is not an edition match. */
export function validBarcode(value) {
 const barcode=String(value || '').replace(/[\s-]/g,'');
 if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(barcode))return null;
 const digits=barcode.split('').map(Number),check=digits.pop();
 const sum=digits.reverse().reduce((n,d,i)=>n+d*(i%2?1:3),0);
 return (10-sum%10)%10===check?barcode:null;
}
