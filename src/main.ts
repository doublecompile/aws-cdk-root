import { App } from "aws-cdk-lib";
import { RootAccountStack } from "./stack";

// for development, use account/region from CDK CLI
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Construct our AWS CDK app.
const app = new App();

// Instantiate the RootAccountStack.
new RootAccountStack(app, "OrgRoot", {
  env: devEnv,
});

// Synthesize the CloudFormation template.
app.synth();
