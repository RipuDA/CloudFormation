'use strict';

const AWS = require('../lib/node_modules/aws-sdk');
const _archiver = require('../lib/node_modules/archiver');
AWS.config.update({ region: "us-east-1" });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });



//This returns us a stream.. consider it as a real pipe sending fluid to S3 bucket.. Don't forget it
const streamTo = (_bucket, _key) => {
    var stream = require('stream');
    var _pass = new stream.PassThrough();
    s3.upload({ Bucket: _bucket, Key: _key, Body: _pass }, (_err, _data) => { if(_err){
            console.log(_err, _err.stack);
        }
        else {
            console.log('S3 Upload is successful');
        } } );
    return _pass;
};

exports.handler = async(event,context, callback) => {
    
    var _keys = [];
    console.log(event);
    
    console.log(JSON.parse(event['Records'][0]['body'])['Records'][0]);
    
    
    var _fileprefix = JSON.parse(event['Records'][0]['body'])['Records'][0]['s3']['object']['key'].split('/')[0];
    var _bucket = JSON.parse(event['Records'][0]['body'])['Records'][0]['s3']['bucket']['name'];
    const _filename = _fileprefix+".zip";
    var _targetBucket = '001audible-groot-archive';
    
    const _listparam = {Bucket:_bucket,Prefix:_fileprefix+'/',Delimiter:'/'};
    s3.listObjects(_listparam, function(err, data) {
            if (err) {
                return 'There was an error viewing your album: ' + err.message
            }else{
                console.log(data.Contents,"<<<all content");
                
                data.Contents.forEach(function(obj,index){
                    //console.log(obj.Key,"<<<file path")
                    if(obj.Key.split('/')[1].length!=0 && obj.Key.split('.')[1]!='done')
                     {
                         console.log(obj.Key.split('/')[1].length);
                         console.log(obj.Key.split('.'));
                         _keys.push(obj.Key);
                     }
                    console.log(_keys);
                })
            }
        });
    
    
    var _list = await Promise.all(_keys.map(_key => new Promise((_resolve, _reject) => {
         const params = {
                    Bucket: _bucket,
                    Key: _key
                };
        s3.getObject(params).promise()
            .then(_data => _resolve({ data: _data.Body, name: _key/*'${_key.split(' / ').pop()}'*/ }));
    }))).catch(_err => { throw new Error(_err) });

    await new Promise((_resolve, _reject) => {
        var _myStream = streamTo(_targetBucket, _filename); //Now we instantiate that pipe...
        var _archive = _archiver('zip');
        _archive.on('error', err => { throw new Error(err); });

        //Your promise gets resolved when the fluid stops running... so that's when you get to close and resolve
        _myStream.on('close', _resolve);
        _myStream.on('end', _resolve);
        _myStream.on('error', _reject);

        _archive.pipe(_myStream); //Pass that pipe to _archive so it can push the fluid straigh down to S3 bucket
        _list.forEach(_itm => _archive.append(_itm.data, { name: _itm.name })); //And then we start adding files to it
        _archive.finalize(); //Tell is, that's all we want to add. Then when it finishes, the promise will resolve in one of those events up there
    }).catch(_err => { throw new Error(_err) });

    callback(null, {}); //Handle response back to server
};