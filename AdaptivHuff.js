var HuffTree = require('./HuffTree.js');
var printf = require('./printf.js');

function AdaptivHuff(callback,decompres){
	this.mode = decompres;
	this.writeCallback = callback;
	this.outputBuffer = new Buffer(1024);
	this.outputBufferPos = 0;
	this.buffer = new Buffer(1024);
	this.trees = new Array(256);
	this.byteOffset = 0;
	this.bytePart = 0;
	this.byteLast = 0;
	this.bytesWrote = 0;
	this.traceData = {offset:0,size:0,state:0,buffer:this.buffer,symbol:0,NYT:false};
}

AdaptivHuff.prototype.putByte = function(b){
	this.outputBuffer[this.outputBufferPos++] = b;
	if(this.outputBufferPos >= this.outputBuffer.length){
		this.writeCallback(this.outputBuffer,this.outputBuffer.length);
		this.outputBufferPos = 0;
		this.bytesWrote += this.outputBuffer.length;
	}
}

AdaptivHuff.prototype.write = function(l){
	for(var i=l-1; i>=0; i--){
		this.bytePart <<= 1;
		this.bytePart |= this.buffer[i];
		if(++this.byteOffset == 8){
			this.putByte(this.bytePart);
			this.byteOffset = 0;
			this.bytePart = 0;
		}
	}
}

AdaptivHuff.prototype.flush = function(){
	if(!this.mode && this.byteOffset > 0){
		var data = {symbol:255,buffer:this.buffer,NYT:false};
		var t = this.trees[this.byteLast];
		if(typeof t == 'undefined'){
			var t = new HuffTree(256);
			this.trees[this.byteLast] = t; 
		}
		t.symbols[255] = 0; //UGLY!!! (forced NYT)
		this.write(t.trace(data));
		this.putByte(this.bytePart << (8-this.byteOffset));
	}
	this.writeCallback(this.outputBuffer,this.outputBufferPos);
}

AdaptivHuff.prototype.compress = function(chunk,size){
	var data = this.traceData;
	for(var i=0; i<size; i++){
		var t = this.trees[this.byteLast];
		if(typeof t == 'undefined'){
			var t = new HuffTree(256);
			this.trees[this.byteLast] = t; 
		}
		var sym = chunk[i];
		this.byteLast = sym;
		data.symbol = sym;
		this.write(t.trace(data));
		t.update(sym);
		if(data.NYT){
			for(var j=0; j<8; j++){
				this.buffer[j] = sym&1;
				sym >>= 1;
			}
			this.write(8);
		}
	}
}

AdaptivHuff.prototype.decompress = function(chunk,size){
	var data = this.traceData;
	for(var pos=0; pos<size; pos+=128){
		var cnt = (size-pos)>=128?128:(size-pos);
		for(var k=0; k<cnt; k++){
			var b = chunk[pos+k];
			for(var j=0; j<8; j++){
				data.buffer[j+8*k] = b&0x80;
				b <<= 1;
			}
		}
		data.size = cnt*8;
		data.offset = 0;
		if(this.byteOffset > 0){
			for(var i=0; i<this.byteOffset; i++){
				this.bytePart <<= 1;
				if(data.buffer[i])
					this.bytePart |= 1;
			}
			this.trees[this.byteLast].update(this.bytePart);
			this.putByte(this.bytePart);
			this.byteLast = this.bytePart;
			this.bytePart = 0;
			data.offset = this.byteOffset;
			this.byteOffset = 0;
		}
		while(true){
			var t = this.trees[this.byteLast];
			if(typeof t == 'undefined'){
				var t = new HuffTree(256);
				this.trees[this.byteLast] = t; 
				data.symbol = -1;
			}else{
				if(t.retrace(data) == 0)
					break;
			}
			if(data.symbol == -1){
				var b = 0;
				if(data.offset+8 > data.size){
					for(var i=data.offset; i<data.size; i++){
						b <<= 1;
						if(data.buffer[i])
							b |= 1;
					}
					this.bytePart = b;
					this.byteOffset = 8-(data.size-data.offset);
					break;
				}else{
					for(var i=data.offset; i<data.offset+8; i++){
						b <<= 1;
						if(data.buffer[i])
							b |= 1;
					}
					data.symbol = b;
					data.offset += 8;
				}
			}
			this.byteLast = data.symbol;
			t.update(data.symbol);
			this.putByte(data.symbol);
		}
	}
}

AdaptivHuff.prototype.update = function(chunk,size){
	if(this.mode){
		this.decompress(chunk,size);
	}else{
		this.compress(chunk,size);
	}
}

module.exports = AdaptivHuff;