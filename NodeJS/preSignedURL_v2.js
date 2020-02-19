var AWS = require('aws-sdk');;

exports.handler = (event, context, callback) => {
  
  console.log(event);
  
  if(event['SAMLResponse']) {

    // Initialize the Amazon Cognito credentials provider
    AWS.config.region = 'us-east-1'; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:5c3d9a07-696d-46a6-9238-1477ab36f541',
      Logins: {
        'arn:aws:iam::942158337222:saml-provider/SalesForce': event['SAMLResponse']
      }
    });

    const s3Object = new AWS.S3({
      apiVersion: "2006-03-01"
    });

    const filename = event['RelayState'] + ".zip"

    const bucketparams = { Bucket: '001audible-groot-archive', Key: filename, Expires: 600 };

    
    s3Object.getSignedUrl('getObject', bucketparams, function(err, url) {
        console.log(err);
        console.log(url);
        callback(null,{ location: url });
    });



  }
  else
  {
    callback(null,'UnAuthorized Access');
  }
};
