var BlockTracker = require('./BlockTracker.js');

function HuffTree(charsetsize){
	var node_count = (charsetsize+1)*2;				//node with index zero is used as a marker
	this.symbols = new Uint32Array(charsetsize); 	//(sym[x] == 0) => (x is NYT)
	this.node_imouto = new Uint32Array(node_count);
	this.node_oniichan = new Uint32Array(node_count);
	this.node_parent = new Uint32Array(node_count);
	this.node_bref = new Array(node_count);			//BlockTracker references
	this.root = node_count-1;				//tree root is constant				
	this.bottom = this.root;			 	//the lowest node number in the tree
	this.trackerHead = new BlockTracker(null,null,1);
	this.trackerHead.heap.push(0); //delete prevention guard
}

HuffTree.prototype.trace = function(data){ //{NYT,buffer,symbol}
	var id = this.symbols[data.symbol];
	data.NYT = false;
	if(id == 0){
		id = this.bottom;
		data.NYT = true;
	}
	var depth = 0;
	while(id != this.root){
		var parent = this.node_parent[id];
		data.buffer[depth++] = (this.node_imouto[parent] == id);
		id = parent;
	}
	return depth;
}


HuffTree.prototype.retrace = function(data){ //{offset,size,state,buffer,symbol}
	var id = data.state==0?this.root:data.state;
	var depth = data.offset;
	while(this.node_oniichan[id] != 0){
		if(depth >= data.size){
			data.state = id;
			return 0;
		}
		id = data.buffer[depth++]?this.node_imouto[id]:this.node_oniichan[id];
	}
	data.offset = depth;
	data.state = 0;
	data.symbol = id==this.bottom?-1:this.node_imouto[id];
	return 1;
}

HuffTree.prototype.update = function(sym){
	var id = this.symbols[sym];
	if(id == 0){ //NYT!
		id = this.bottom;
		if(this.root != id){ 						//root is always a unique block so we do not bind it with the tracker
			this.node_bref[id] = this.trackerHead;	//bind old NYT node with tracker head
			this.trackerHead.heap.push(id);			//add it to the tracker's heap
		}
		var n = id;
		this.node_imouto[id] = --n;	//add new symbol as old NYT's child (sister)
		this.node_imouto[n] = sym; 	//dumb, but saves memory (no need for reverse symbol map)
									//(oniichan == 0) => (node is leaf && imouto == symbol)
		this.node_parent[n] = id;		//set sister's parent
		this.node_bref[n] = this.trackerHead;	//bind tracker head with the node
		this.trackerHead.heap.push(n);	//add it to the tracker's heap
		this.symbols[sym] = n;			//update symbol table
		this.node_oniichan[id] = --n;	//add NYT as old NYT's child (brother)
		this.node_parent[n] = id;		//set brother's parent
		this.bottom = n;				//update tree NYT reference
	}
	while(id != this.root){
		var newid = this.node_bref[id].heap.top();			//get node's new order number
		this.node_bref[id] = this.node_bref[id].update(); 	//update BlockTracker heaps
		if(newid != id){ //if node's order number changed we need to update the tree structure
			//swap children
			var a = this.node_imouto[id];
			this.node_imouto[id] = this.node_imouto[newid];
			this.node_imouto[newid] = a;
			a = this.node_oniichan[id];
			this.node_oniichan[id] = this.node_oniichan[newid];
			this.node_oniichan[newid] = a;
			//update child's parent (if node)
			//update symbol table (if leaf)
			if(this.node_oniichan[id] == 0){ //(oniichan == 0) => (imouto == symbol)
				var sym = this.node_imouto[id];
				this.symbols[sym] = id;
			}else{
				this.node_parent[this.node_imouto[id]] = id;
				this.node_parent[this.node_oniichan[id]] = id;
			}
			if(this.node_oniichan[newid] == 0){ //(oniichan == 0) => (imouto == symbol)
				var sym = this.node_imouto[newid];
				this.symbols[sym] = newid;
			}else{
				this.node_parent[this.node_imouto[newid]] = newid;
				this.node_parent[this.node_oniichan[newid]] = newid;
			}
			//swap BlockTrackers
			a = this.node_bref[id];
			this.node_bref[id] = this.node_bref[newid];
			this.node_bref[newid] = a;
		}
		//move to parent node
		id = this.node_parent[newid];
	}
}

var printf = require('./printf.js');

//4 debug
HuffTree.prototype.print = function(id){
	if(typeof id == 'undefined')
		id = this.root;
	if(id == this.bottom){
		printf("node: %03d\tp: %d\tweight: 1\tNYT!\n",this.bottom,this.node_parent[id]);
		return;
	}
	printf("node: %03d\tp: %d\tweight: %d\t",id,this.node_parent[id],(id==this.root?0:this.node_bref[id].value));
	if(this.node_oniichan[id] == 0){
		printf("leaf! '%s'\n",String.fromCharCode(this.node_imouto[id]));
		return;
	}
	printf("imouto: %03d\t oniichan: %d\n",this.node_imouto[id],this.node_oniichan[id]);
	this.print(this.node_imouto[id]);
	this.print(this.node_oniichan[id]);
}

module.exports = HuffTree;