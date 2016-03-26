# linkPreview
this is a npm package used for extract appropriate title,des,content and imgs from a url,just like what you see when you post a link on google+. It can deal with webpages with variable charset,compressed in deflate and gzip format and relocation url.The result you get maybe not what you want because of the complexity of a webpage,especially the images you want.  
note:this tool will generate a temp.txt whoes content is the url given.

 1. **here is the install**
 

    npm linkPreview

 2. **here is the usage**
 

    var linkPreviewHelper=require('linkPreview');  
    linkPreviewHelper.parse(url).then(succallcallback,errorcallback);

    
    										

    
