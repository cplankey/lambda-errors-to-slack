// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region
AWS.config.update({
    region: 'us-east-1'
});
const cloudwatchlogs = new AWS.CloudWatchLogs();
export async function main(event, context) {
    console.log(JSON.stringify(event));
    var detail = event.detail;

    // no action if this event is not about ec2 instance
    if (!(detail["service"] === "lambda" && detail["resource-type"] === "function")) return;

    var tags = detail["tags"];

    console.log(tags);

    // if associated tags not contain the expected tag pair
    if (!tags.hasOwnProperty("monitoring") || JSON.parse(tags["monitoring"]) !== true) {
        console.log("This function does not have the monitoring tag or tag is not set to true");
        //remove log group subscription if exists and is the subscribing lambda
    } else{
        console.log(`Need to subscribe to ${event.resources[0]}`);
        var resourceSplit = event.resources[0].split(':');
        let functionName = [resourceSplit[resourceSplit.length - 1]];
        var params = {
            destinationArn: process.env.ALERTER_LAMBDA, /* required */
            filterName: 'alerter-lambda', /* required */
            filterPattern: '?"Error: Runtime exited" ?"Task timed out after" ?"\tERROR\t" ?"\\"level\\":\\"error\\""', /* required */
            logGroupName: `/aws/lambda/${functionName}`, /* required */
            distribution: 'ByLogStream'
          };
          let putSubscriptionResponse;
          try{
            putSubscriptionResponse = await  cloudwatchlogs.putSubscriptionFilter(params).promise();
          } catch (err) {
              console.log(err);
          }
          console.log(putSubscriptionResponse);

    }
return {
    statusCode: 200,
    body: JSON.stringify({
            message: 'Go Serverless v1.0! Your function executed successfully!',
            input: event,
        },
        null,
        2
    ),
};

// Use this code if you don't use the http event with the LAMBDA-PROXY integration
// return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};