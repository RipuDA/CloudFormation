const AWS = require('aws-sdk');
var fs = require('../lib/node_modules/fs-extra');
var path = require('path');
var cognitoidentity = new AWS.CognitoIdentity();

var http = require('http');
var s3;
var preSignedURL;

function getSamlCredentials(samlResponse, fileprefix, identityId) {
  var role = 'arn:aws:iam::942158337222:role/SSORole';
  const bucketName = '001audible-groot-archive';
  //const key='leadId12345.zip';

  const key = fileprefix + '.zip';


  var params = {
    IdentityId: identityId,
    CustomRoleArn: role,
    Logins: {
      'arn:aws:iam::942158337222:saml-provider/SalesForce': samlResponse,
    }
  };

  cognitoidentity.getCredentialsForIdentity(params, function(err, data) {
    if (err) {
      throw (new Error(err));

    }
    else {
      console.log('Credentials from Cognito: ');
      console.log(data.Credentials);
      getDownloadUrl(bucketName, key);

    }
  });
}

async function getDownloadUrl(bucketName, file) {
  const { key, versionId } = file
  const params = {
    Bucket: bucketName,
    Key: file, //the directory in S3
    VersionId: versionId, //we use S3 versioning
    Expires: 600
  }
  s3 = new AWS.S3();

  try {
    preSignedURL = await new Promise((resolve, reject) => {
      s3.getSignedUrl('getObject', params, function(err, preSignedURL) {
        if (err) {
          reject(err);
        }
        resolve(preSignedURL);
      })
    })
    console.log('URL::::', preSignedURL);
    const response = {
      location: preSignedURL
    };

    return response;
  }
  catch (err) {
    console.log('s3 getObject,  get signedUrl failed')
    throw (new Error(err));
  }
}


exports.handler = (event, context, callback) => {
  // TODO implement


  if (!event['SAMLRespose']) {

    var identityId;
    var sessionToken;
    var secretAccessKey;
    var accessKeyId;

    // Initialize the Amazon Cognito credentials provider
    AWS.config.region = 'us-east-1'; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:5c3d9a07-696d-46a6-9238-1477ab36f541'


    });

    AWS.config.update({
      region: AWS.config.region,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-east-1:5c3d9a07-696d-46a6-9238-1477ab36f541'

      })

    });


    AWS.config.credentials.get(function() {

        identityId = AWS.config.credentials.identityId;

        console.log(event);

        const response=getSamlCredentials(event['SAMLResponse'], event['RelayState'], identityId);
        callback(null,response);

      }

    );

  }

}
