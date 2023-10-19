const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();

// lambda-func-uploader 사용자 설정
AWS.config.update({
    region: 'ap-northeast-2',
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_KEY
});

// 임시 자격 증명을 요청
const assumeRoleParams = {
    RoleArn: process.env.ROLE_ARN,
    RoleSessionName: process.env.ROLE_NAME,
    DurationSeconds: 3600,
};

// IAM 역할을 통한 임시 자격 증명을 얻기 위한 AWS STS 객체 생성
const sts = new AWS.STS();

sts.assumeRole(assumeRoleParams, (err, data) => {
    if (err) {
        console.error('Error assuming role:', err);
    } else {
        // 얻은 임시 자격 증명으로 새로운 AWS 서비스 객체 생성
        const temporaryCredentials = {
            accessKeyId: data.Credentials.AccessKeyId,
            secretAccessKey: data.Credentials.SecretAccessKey,
            sessionToken: data.Credentials.SessionToken,
        };
        console.log('Get temporaryCredentials successfully');

        const lambda = new AWS.Lambda(temporaryCredentials);
        const s3 = new AWS.S3(temporaryCredentials);


        const functionName = 'YourLambdaFuncName';
        const bucketName = 'UploadS3BucketName';
        const zipFilePath = `./${functionName}.zip`;

        // Lambda 함수 ZIP 아카이브 업로드
        const uploadParams = {
            Bucket: bucketName,
            Key: `${functionName}.zip`,
            Body: fs.createReadStream(zipFilePath),
            ACL: 'private',
        };

        s3.upload(uploadParams, (err, data) => {
            if (err) {
                console.error('Error uploading Lambda ZIP file to S3', err);
            } else {
                console.log('Lambda ZIP file uploaded successfully:', data.Location);

                // Lambda 함수 업데이트
                const lambdaParams = {
                    FunctionName: functionName,
                    S3Bucket: bucketName,
                    S3Key: `${functionName}.zip`,
                };

                lambda.updateFunctionCode(lambdaParams, (err, data) => {
                    if (err) {
                        console.error('Error updating Lambda function code', err);
                    } else {
                        console.log('Lambda function code updated successfully:', data.FunctionArn);
                    }
                });
            }
        });
    }
}
);

