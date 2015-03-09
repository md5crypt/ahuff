function Heap(){
	this.data = new Array();
	this.length = 0;
}

Heap.prototype.push = function(e){
	var data = this.data;
	data.push(e);
	this.length = data.length;
	var a = data.length-1;
	while(a > 0){
		var b = (a-1)>>1;
		if(data[a] <= data[b])
			return;
		var t = data[a];
		data[a] = data[b];
		data[b] = t;
		a = b;
	}
}

Heap.prototype.pop = function(){
	var data = this.data;
	if(data.length == 1){
		this.length = 0;
		return data.pop();
	}
	var top = data[0];
	data[0] = data.pop();
	var size = data.length;
	this.length = size;
	var a = 0;
	while(1){
		if((a<<1)+1 >= size)
			break;
		var b;
		if((a<<1)+2 >= size)
			b = (a<<1)+1;
		else
			b = data[(a<<1)+1]>data[(a<<1)+2]?(a<<1)+1:(a<<1)+2;
		if(data[b] <= data[a])
			break;
		var t = data[a];
		data[a] = data[b];
		data[b] = t;
		a = b;
	}
	return top;
}

Heap.prototype.top = function(){
	return this.data[0];
}
module.exports = Heap;