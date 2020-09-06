const https = require('https');
const Promise    = require('bluebird');
const zlib       = Promise.promisifyAll(require('zlib'));
export async function main(event, context) {
    const payload = new Buffer(event.awslogs.data, 'base64');
    const gunzipped = (await zlib.gunzipAsync(payload)).toString('utf8');
    const eventDetails = JSON.parse(gunzipped);
    let messageArray = eventDetails.logEvents[0].message.split('\t');
    let errorJSON, errorType, errorMessage;
    if (messageArray[4]){
        //real error
        errorJSON = JSON.parse(messageArray[4]);
        errorType = errorJSON.errorType;
        errorMessage = errorJSON.errorMessage;
    } else {
        //console.error
        errorType = 'console.error()';
        errorMessage = messageArray[3];
    }

    let timestamp = messageArray[0];
    let functionName = eventDetails.logGroup.split('/')[3];
    let logStream = eventDetails.logStream;
    await postToSlack(errorType, timestamp, errorMessage, functionName, logStream);
    return;
};
let postToSlack = (errorType, timestamp, errorMessage, functionName, logStream) => {
    return new Promise((resolve, reject) => {
        var options = {
            "method": "POST",
            "hostname": 'hooks.slack.com',
            "path": `/services/${process.env.SLACK_WEBHOOK_URL}`,
            "headers": {
                "Content-Type": "application/json"
            }
        };
        var req = https.request(options, (res) => {
            resolve('Success');
        });
        req.on('error', (e) => {
            reject(e.message);
        });
        // send the request
        req.write(JSON.stringify({
            "blocks": [
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": `*Type:*\n${errorType}`
                        },
                        {
                            "type": "mrkdwn",
                            "text": `*Timestamp:*\n${timestamp}`
                        },
                        {
                            "type": "mrkdwn",
                            "text": `*Error:*\n${errorMessage}`
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "plain_text",
                            "text": `Lambda: ${functionName}`,
                            "emoji": true
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "plain_text",
                            "text": `Log Stream: ${logStream}`,
                            "emoji": true
                        }
                    ]
                }
            ]
        }));
        req.end();
    });
};