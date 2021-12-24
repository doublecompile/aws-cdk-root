#!/usr/bin/env node

const cdk = require("aws-cdk-lib");
const { RootAccountStack } = require("../lib/root-account-stack");

// Construct our AWS CDK app.
const app = new cdk.App();

// Instantiate the RootAccountStack.
const rootAccountStack = new RootAccountStack(app, "root-account", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Synthesize the CloudFormation template.
app.synth();
