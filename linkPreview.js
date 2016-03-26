var http = require('http');
var fs = require('fs');
var iconv = require('iconv-lite');
var parse5 = require('parse5');
var https=require('https');
var URL=require('url');
var TreeAdapter = parse5.treeAdapters.default;
var zlib=require('zlib');
var TASK=require('./task.js');

var relocCount=0;
var linkPreviewHelper = {
	parse:function(url){
		var promise=new Promise(function(resolve,reject){
			var tempprotocol=URL.parse(url).protocol;
			var host=URL.parse(url).hostname;
			var protocol=http;
			if(tempprotocol=='https:')
				protocol=https;
			//判断重定向
			var req = protocol.get(url, function(res) {
				var loc=linkPreviewHelper.getLocationFromHeader(res.headers);
				if(loc!=null){
					if(relocCount<5){
						relocCount++;
						linkPreviewHelper.parse(loc).then(function(success){
							resolve(success);
							relocCount=0;
						},function(error){
							reject({
								message:error.message
							});
							relocCount=0;
						});
					}else{
						reject({
							message:'more relocation'
						});
						relocCount=0;
					}
					return;
				}
				var charset=linkPreviewHelper.getCharsetFromHeader(res.headers);
				var promise;

				if(charset!=null){
					if(charset=='utf-8')
						promise=linkPreviewHelper.headerWithUTF8(res);
					else
						promise=linkPreviewHelper.headerWithNoUTF8(res,charset);
				}else
					promise=linkPreviewHelper.headerWithoutCharset(res);
				promise.then(function(document){
					var file=fs.createWriteStream(process.cwd()+"/temp.txt");
					file.write(parse5.serialize(document));
					//获取描述信息
					var desTask=new TASK.GetDesTask();
					var imgTask=new TASK.GetImgTask();
					var titleTask=new TASK.GetTitleTask();
					var contentTask=new TASK.GetContentTask();
					linkPreviewHelper.doWork(document,[desTask,imgTask,titleTask,contentTask]);
					//有些图片可能用的是相对路径
					var imgs=[];
					for(var i=0;i<imgTask.result.length;i++){
						if(imgTask.result[i].indexOf('http')!=-1){
							imgs.push(imgTask.result[i]);
						}
					}
					resolve({
						des:desTask.result,
						title:titleTask.result,
						imgs:imgs,
						host:host,
						url:url,
						content:contentTask.result
					});
				},function(error){
					console.log(error);
					reject({
						message:error.message
					});
				});
			});
		});
		return promise;
	},
	getLocationFromHeader:function(headers){
		var url=headers['location'];
		return url;
	},
	getCharsetFromHeader:function(headers){
		var contentType=headers['content-type'];
		var reg=/charset\s*=\s*([^\s;]+)/;
		var charset;
		if(contentType!=null && reg.test(contentType)){
			charset = contentType.match(reg)[1];
		}
		return charset;
	},
	headerWithUTF8:function(res){
		var promise=new Promise(function(resolve,reject){
			var parser=new parse5.ParserStream();
			var unzipstream;
			switch(res.headers['content-encoding']){
				case 'gzip':
					unzipstream=new zlib.createGunzip();
					res.pipe(unzipstream).pipe(parser);
					break;
				case 'deflate':
					unzipstream=new zlib.createInflate();
					res.pipe(unzipstream).pipe(parser);
					break;
				default:
					res.pipe(parser);
			}
			
			parser.on('finish',function(){
				resolve(parser.document);
				console.dir(parser.document);
			});
			parser.on('error',function(e){
				reject(e);
			});
		});
		return promise;
	},
	headerWithNoUTF8:function(res,charset){
		var promise=new Promise(function(resolve,reject){
			var parser=new parse5.ParserStream();
			var converterStream=iconv.decodeStream(charset);
			switch(res.headers['content-encoding']){
				case 'gzip':
					res.pipe(new zlib.createGunzip()).pipe(converterStream).pipe(parser);
					break;
				case 'deflate':
					res.pipe(new zlib.createInflate()).pipe(converterStream).pipe(parser);
					break;
				default:
					res.pipe(converterStream).pipe(parser);
			}
			parser.on('finish',function(){
				resolve(parser.document);
			});
			parser.on('error',function(e){
				reject(e);
			});
		});
		return promise;
	},
	headerWithoutCharset:function(res){
		var promise=new Promise(function(resolve,reject){
			var parser=new parse5.ParserStream();
			var unzipstream;
			switch(res.headers['content-encoding']){
				case 'gzip':
					unzipstream=new zlib.createGunzip();
					res.pipe(unzipstream).pipe(parser);
					break;
				case 'deflate':
					unzipstream=new zlib.createInflate();
					res.pipe(unzipstream).pipe(parser);
					break;
				default:
					res.pipe(parser);
			}
			//纪录元数据，后面解码可能需要
			var buffer=new Buffer("");
			if(unzipstream!=null){
				unzipstream.on('data',function(chunk){
					buffer=Buffer.concat([buffer,chunk]);
				});
			}else
				res.on('data',function(chunk){
					buffer=Buffer.concat([buffer,chunk]);
				});

			parser.on('finish',function(){
				var task=new TASK.GetCharsetTask();
				linkPreviewHelper.doWork(parser.document,[task]);
				if(task.isDone){
					var charset=task.result;
					if(charset=='utf-8')
						resolve(parser.document);
					else{
						var html=iconv.decode(buffer,charset);
						resolve(parse5.parse(html));
					}
				}else{
					resolve(parser.document);
				}
			});
			parser.on('error',function(e){
				reject(e);
			});
		});
		return promise;
	},
	doWork:function(node,tasks){
		for(var i=0;i<tasks.length;i++){
			if(!tasks[i].isDone){
				tasks[i].work(node);
			}
		}
		if(!linkPreviewHelper.isDone(tasks)){

			var childs = TreeAdapter.getChildNodes(node);
			if (childs != null){
				for (var i = 0; i < childs.length; i++) {
					linkPreviewHelper.doWork(childs[i],tasks);
					if(linkPreviewHelper.isDone(tasks))
						break;
				}
			}
		}
		//重启所有任务
		for(var i=0;i<tasks.length;i++){
			tasks[i].resume(node);
		}
	},
	//返回任务列表是否完成
	isDone:function(tasks){
		var isDone=true;
		for(var i=0;i<tasks.length;i++)
			if(!tasks[i].isDone){
				isDone=false;
				break;
			}
		return isDone;
	}
};
module.exports = linkPreviewHelper;