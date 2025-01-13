import { awscdk, javascript } from "projen";

const project = new awscdk.AwsCdkTypeScriptApp({
  name: "@doublecompile/aws-cdk-root",
  description:
    "An AWS CDK application comprising sane auditing and security for root accounts in an organization",
  authorName: "Jonathan Hawk",
  authorUrl: "https://doublecompile.com/",
  projenrcTs: true,

  homepage: "https://github.com/doublecompile/aws-cdk-storage-account",
  bugsUrl: "https://github.com/doublecompile/aws-cdk-storage-account/issues",

  prettier: true,
  licensed: false,
  lambdaAutoDiscover: false,
  codeCov: true,

  defaultReleaseBranch: "main",
  githubOptions: {
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: ["feat", "fix", "chore", "docs"],
      },
    },
  },
  workflowNodeVersion: "22",
  workflowPackageCache: true,

  cdkVersion: "2.89.0",
  majorVersion: 1,
  minNodeVersion: "18.0.0",

  projenTokenSecret: "PROJEN_GITHUB_TOKEN",
  autoApproveOptions: {
    // Anyone with write access to this repository can have auto-approval.
    allowedUsernames: [],
  },

  depsUpgradeOptions: {
    workflowOptions: {
      labels: ["auto-approve"],
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
    },
  },

  deps: [],
  devDeps: [],
  packageName: "@doublecompile/aws-cdk-root",

  tsconfig: { compilerOptions: { lib: ["ES2022"], target: "es2022" } },

  context: {
    // "@aws-cdk/core:enablePartitionLiterals": true,
    // "@aws-cdk/aws-iam:minimizePolicies": true,
    OrganizationId: "o-xvbg4b6uto",
  },
});

const packageJson = project.tryFindObjectFile("package.json");
packageJson?.addOverride("private", true);

project.synth();
