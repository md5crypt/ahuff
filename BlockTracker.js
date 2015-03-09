var Heap = require('./Heap.js');

function BlockTracker(prev,next,value){
	if(prev != null)
		prev.next = this;
	this.prev = prev;
	if(next != null)
		next.prev = this;
	this.next = next;
	this.value = value;
	this.heap = new Heap;
}

BlockTracker.prototype.update = function(){
	if(this.next != null && this.next.value == this.value+1){
		var id = this.heap.pop();
		this.next.heap.push(id);
		if(this.heap.length == 0){
			this.prev.next = this.next;
			if(this.next != null)
				this.next.prev = this.prev;
		}
		return this.next;
	}
	if(this.heap.length == 1){
		this.value++;
		return this;
	}
	var id = this.heap.pop();
	var tracker = new BlockTracker(this,this.next,this.value+1);
	tracker.heap.push(id);
	return tracker;
}

module.exports = BlockTracker;