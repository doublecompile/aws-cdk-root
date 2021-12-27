# Root Account CDK Project

An AWS CDK app providing a stack comprising sane auditing and security for root accounts in an organization.

The `cdk.json` file tells the CDK Toolkit how to execute this app.

## Prerequisites

We generally expect AWS Organizations to be setup and CloudTrail to be added as a trusted service.

```
aws organizations enable-aws-service-access --service-principal cloudtrail.amazonaws.com
aws iam create-service-linked-role --aws-service-name cloudtrail.amazonaws.com
```

## Context

The following context values are available to specify on the command line.

* `organization` – Required. The AWS Organizations ID of the root account.

## Useful commands

- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
