var HuffCompresor = require('./AdaptivHuff.js');
var printf = require('./printf.js');
var fs = require('fs');

function huffFile(inFile,outFile,decompress){
	var fileSize = fs.statSync(inFile).size;
	var infd = fs.openSync(inFile,"r");
	var outfd = fs.openSync(outFile,"w");
	huff = new HuffCompresor(function(a,b){
		fs.writeSync(outfd,a,0,b);
	},decompress);
	var buff = new Buffer(1024*16);
	var bytesRead = 0;
	var chunkSize = fs.readSync(infd,buff,0,1024*16);
	while(chunkSize > 0){
		huff.update(buff,chunkSize);
		bytesRead += chunkSize;
		printf("\r%.02f%%\trate: %.02f%%\tmemory usage: %.02f Mb",bytesRead*100/fileSize,huff.bytesWrote*100/bytesRead,process.memoryUsage().heapTotal/1024/1024);
		chunkSize = fs.readSync(infd,buff,0,1024*16);
	}
	printf("\n");
	huff.flush();
	fs.closeSync(infd);
	fs.closeSync(outfd);
}

if(process.argv[2] == "x")
	huffFile(process.argv[3],process.argv[3].slice(0,-5)+'raw',true);
else
	huffFile(process.argv[2],process.argv[2]+'.ahuff',false);