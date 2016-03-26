var parse5 = require('parse5');
var TreeAdapter = parse5.treeAdapters.default;

//一项任务的父类
function Task(){
	this.isDone=false;
	this.result=null;
	var pending=false;
	var pendingNode=null;
	this.resume=function(node){
		if(node==pendingNode)
			pending=false;
	};
	this.pend=function(node){
		pending=true;
		pendingNode=node;
	};
	this.isPending=function(){
		return pending;
	};
}
//获取字符集
function GetCharsetTask(){
	Task.call(this);
	this.work=function(node){
		if (TreeAdapter.getTagName(node) == 'meta') {
			var attrs = TreeAdapter.getAttrList(node);
			if (attrs != null) {
				for (var j = 0; j < attrs.length; j++)
					if (attrs[j].name == "charset") {
						this.result=attrs[j].value;
						this.isDone=true;
					}
				if(!this.isDone){
					var attrObj={};

					for(var j=0;j<attrs.length;j++){
						var key=attrs[j].name.trim().toLowerCase();
						var value=null;
						if(attrs[j].value!=null)
							value=attrs[j].value.trim().toLowerCase();
						attrObj[key]=value;
					}
					if(attrObj['http-equiv']=='content-type'){
						var content=attrObj['content'];
						var reg=/charset\s*=\s*([^\s;]+)/;
						if(reg.test(content)){
							this.result=content.match(reg)[1];
							this.isDone=true;
						}
					}
				}
			}
		}
	};
}
//获取description
function GetDesTask(){
	Task.call(this);
	this.work=function(node){
		if (TreeAdapter.getTagName(node) == 'meta') {
			var attrs = TreeAdapter.getAttrList(node);
			if (attrs != null) {
				var isDes = false;
				for (var j = 0; j < attrs.length; j++)
					if (attrs[j].name == "name" && attrs[j].value!=null &&
						(attrs[j].value.toLowerCase() == "description" 
							||attrs[j].value.toLowerCase() == "og:description")) {
						isDes = true;
						break;
					}
				if (isDes) {
					for (var j = 0; j < attrs.length; j++)
						if (attrs[j].name == "content") {
							this.result = attrs[j].value;
							this.isDone=true;
						}
				}
			}
		}
	};
}
//获取title
function GetTitleTask(){
	Task.call(this);
	this.work=function(node){
		if (TreeAdapter.getTagName(node) == "title") {
			var childs = TreeAdapter.getChildNodes(node);
			if (childs != null && childs.length > 0)
				this.result=TreeAdapter.getTextNodeContent(childs[0]);
			this.isDone=true;
		}
		if (TreeAdapter.getTagName(node) == 'meta') {
			var attrs = TreeAdapter.getAttrList(node);
			if (attrs != null) {
				var isDes = false;
				for (var j = 0; j < attrs.length; j++)
					if (attrs[j].name == "name" && attrs[j].value!=null &&
						attrs[j].value.toLowerCase() == "og:title") {
						isDes = true;
						break;
					}
				if (isDes) {
					for (var j = 0; j < attrs.length; j++)
						if (attrs[j].name == "content") {
							this.result = attrs[j].value;
							this.isDone=true;
						}
				}
			}
		}
	};
}
//获取images
function GetImgTask(){
	Task.call(this);
	this.result=[];
	this.work=function(node){
		if(!this.isPending()){
			if (TreeAdapter.getTagName(node) == 'meta') {
				var attrs = TreeAdapter.getAttrList(node);
				if (attrs != null) {
					var isDes = false;
					for (var j = 0; j < attrs.length; j++)
						if (attrs[j].name == "name" && attrs[j].value!=null &&
							attrs[j].value.toLowerCase() == "og:image") {
							isDes = true;
							break;
						}
					if (isDes) {
						for (var j = 0; j < attrs.length; j++)
							if (attrs[j].name == "content") {
								this.result.push(attrs[j].value);
								this.isDone=true;
							}
					}
				}
			}
			if (TreeAdapter.getTagName(node) == 'img') {
				var attrs = TreeAdapter.getAttrList(node);
				if (attrs != null)
					for (var i = 0; i < attrs.length; i++)
						if (attrs[i].name == 'src')
							if(attrs[i].value!=null && !/(\.gif|\.icon)$/.test(attrs[i].value))
							this.result.push(attrs[i].value);
			}
		}
	};
}
//获取可能有价值的内容
function GetContentTask(){
	Task.call(this);
	this.result=[];
	this.work=function(node){
		if(!this.isPending()){
			if(this.result.length>10)
				this.isDone=true;
			if(TreeAdapter.isTextNode(node)){
				var text=TreeAdapter.getTextNodeContent(node);
				if(text.trim().length>4)
					this.result.push(text.trim());
			}
			var tagname=TreeAdapter.getTagName(node);
			if ( tagname =='a' || tagname=='script' || tagname=='style'){
				this.pend(node);
			}
		}
	};
}
module.exports={
	GetCharsetTask:GetCharsetTask,
	GetTitleTask:GetTitleTask,
	GetDesTask:GetDesTask,
	GetImgTask:GetImgTask,
	GetContentTask:GetContentTask
};