var express = require('express');
var app = express();
app.get('/', function(req, res) {
	res.send('hello world qa');
});
app.get('/health',function(req,res){
	res.send('health check. Add this for checking response change with imagePullPolicy:Always active');
});

var server = app.listen(8080, function(){
var host = server.address().address;
var port = server.address().port;
console.log("Example app listening at 'http://%s:%s'",host,port);
});
