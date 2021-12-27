const { Construct } = require("constructs");
const { Stack, Duration } = require("aws-cdk-lib");
const { Trail } = require("aws-cdk-lib/aws-cloudtrail");
const {
  ServicePrincipal,
  Role,
  PolicyStatement,
} = require("aws-cdk-lib/aws-iam");
const {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
  StorageClass,
} = require("aws-cdk-lib/aws-s3");
const { Key } = require("aws-cdk-lib/aws-kms");
const { LogGroup, RetentionDays } = require("aws-cdk-lib/aws-logs");

const TRAIL = Symbol("trail");
const BUCKET = Symbol("bucket");
const LOG_GROUP = Symbol("logGroup");
const STORAGE_KEY = Symbol("storageKey");
const LOG_GROUP_KEY = Symbol("logGroupKey");

/**
 * The setup for CloudTrail.
 */
class CloudTrailSetup extends Construct {
  /**
   * @param {constructs.Construct} scope - The scope in which to define this construct.
   * @param {string} id - The scoped construct ID.
   * @param {Object} props - The properties.
   * @param {string} props.organizationId - The AWS Organizations ID of the root account.
   * @param {number} props.logGroupRetentionDays - The number of days to keep CloudWatch Logs entries.
   */
  constructor(scope, id, props = {}) {
    super(scope, id);
    const region = Stack.of(this).region;
    const account = Stack.of(this).account;

    if (!props.organizationId) {
      throw new Error('"organizationId" is required');
    }

    const cloudTrailPrincipal = new ServicePrincipal(
      "cloudtrail.amazonaws.com"
    );

    const storageKey = new Key(this, "StorageKey", {
      description: "Encrypts CloudTrail destination S3 bucket",
      enabled: true,
      enableKeyRotation: true,
    });
    this[STORAGE_KEY] = storageKey;

    const logGroupKey = new Key(this, "LogGroupKey", {
      description: "Encrypts CloudTrail destination CloudWatch Log Group",
      enabled: true,
      enableKeyRotation: true,
    });
    this[LOG_GROUP_KEY] = logGroupKey;

    this[BUCKET] = new Bucket(this, "Storage", {
      encryption: BucketEncryption.KMS,
      encryptionKey: storageKey,
      bucketKeyEnabled: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    this[BUCKET].addLifecycleRule({
      transitions: [
        {
          storageClass: StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30),
        },
      ],
    });

    // While the CDK takes care of PutObject for non-organization trails, we
    // must add our own policy for the organization trail.
    const bucketOrganizationPolicy = new PolicyStatement({
      resources: [
        this[BUCKET].arnForObjects(
          `AWSLogs/${props.organizationId}/${Stack.of(this).account}/*`
        ),
      ],
      actions: ["s3:PutObject"],
      principals: [cloudTrailPrincipal],
      conditions: {
        StringEquals: { "s3:x-amz-acl": "bucket-owner-full-control" },
      },
    });
    this[BUCKET].addToResourcePolicy(bucketOrganizationPolicy);

    // Per the AWS documentation:
    // https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
    // https://docs.aws.amazon.com/awscloudtrail/latest/userguide/encrypting-cloudtrail-log-files-with-aws-kms.html
    // CloudTrail must be granted DescribeKey, Decrypt, and GenerateDataKey*.
    const cloudTrailStorageKeyGrant =
      storageKey.grantEncryptDecrypt(cloudTrailPrincipal);
    cloudTrailStorageKeyGrant.resourceStatement.addActions("kms:DescribeKey");

    this[LOG_GROUP] = new LogGroup(this, "LogGroup", {
      encryptionKey: logGroupKey,
      retention: props.logGroupRetentionDays || RetentionDays.ONE_MONTH,
    });

    // Per the AWS documentation:
    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
    // CloudWatch Logs must be granted Encrypt/Decrypt and Describe*.
    const logGroupPrincipal = new ServicePrincipal(
      `logs.${region}.amazonaws.com`
    );
    const cloudWatchLogsKeyGrant =
      logGroupKey.grantEncryptDecrypt(logGroupPrincipal);
    cloudWatchLogsKeyGrant.resourceStatement.addActions("kms:Describe*");

    this[TRAIL] = new Trail(this, "Trail", {
      encryptionKey: storageKey,
      bucket: this[BUCKET],
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: this[LOG_GROUP],
    });
    this[TRAIL].node.defaultChild.isOrganizationTrail = true;

    cloudTrailStorageKeyGrant.resourceStatement.addCondition("StringLike", {
      "aws:SourceArn": `arn:aws:cloudtrail:${region}:${account}:trail/*`,
    });
    cloudWatchLogsKeyGrant.resourceStatement.addCondition("ArnLike", {
      "kms:EncryptionContext:aws:logs:arn": `arn:aws:logs:${region}:${account}:log-group:*`,
    });

    // For limiting the key usage to specific accounts.
    //   "StringLike": {
    //     "kms:EncryptionContext:aws:cloudtrail:arn": [
    //       "arn:aws:cloudtrail:*:account-id:trail/*"
    //     ]
    //   },
  }

  /**
   * @return {aws-cdk-lib/aws-kms.Key} The S3 bucket's KMS key
   */
  get storageKey() {
    return this[STORAGE_KEY];
  }

  /**
   * @return {aws-cdk-lib/aws-kms.Key} The CloudWatch Logs group's KMS key
   */
  get logGroupKey() {
    return this[LOG_GROUP_KEY];
  }

  /**
   * @return {aws-cdk-lib/aws-logs.LogGroup} The CloudWatch Logs group.
   */
  get logGroup() {
    return this[LOG_GROUP];
  }

  /**
   * @return {aws-cdk-lib/aws-cloudtrail.Trail} The CloudTrail trail construct.
   */
  get trail() {
    return this[TRAIL];
  }

  /**
   * @return {aws-cdk-lib/aws-s3.Bucket} The S3 bucket.
   */
  get bucket() {
    return this[BUCKET];
  }
}

module.exports = { CloudTrailSetup };
