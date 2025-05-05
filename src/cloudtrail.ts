import { Stack, Duration } from "aws-cdk-lib";
import { CfnTrail, Trail } from "aws-cdk-lib/aws-cloudtrail";
import { ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
  StorageClass,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

/**
 * Constructor properties for CloudTrailSetup.
 */
export interface CloudTrailSetupProps {
  /**
   * The ID of the orginaziton in AWS Organizations
   */
  readonly organizationId?: string;

  /**
   * The number of days the log group may retain logs.
   */
  readonly logGroupRetentionDays?: number;
}

/**
 * The setup for CloudTrail.
 */
export class CloudTrailSetup extends Construct {
  /**
   * The S3 bucket.
   */
  public readonly bucket: Bucket;

  /**
   * The CloudTrail trail construct.
   */
  public readonly trail: Trail;

  /**
   * The CloudWatch Logs group.
   */
  public readonly logGroup: LogGroup;

  /**
   * The KMS key for encryption at rest.
   */
  public readonly encryptionKey: Key;

  /**
   * @param scope - The scope in which to define this construct.
   * @param id - The scoped construct ID.
   * @param props - The properties.
   * @param props.organizationId - The AWS Organizations ID of the root account.
   * @param props.logGroupRetentionDays - The number of days to keep CloudWatch Logs entries.
   */
  constructor(scope: Construct, id: string, props: CloudTrailSetupProps = {}) {
    super(scope, id);

    const { region, account } = Stack.of(this);

    const { organizationId, logGroupRetentionDays } = props;

    if (!organizationId) {
      throw new Error('"organizationId" is required');
    }

    const cloudTrailPrincipal = new ServicePrincipal(
      "cloudtrail.amazonaws.com"
    );

    const storageKey = new Key(this, "Key", {
      description: "Encrypts CloudTrail destination S3 bucket",
      enabled: true,
      enableKeyRotation: true,
    });
    this.encryptionKey = storageKey;

    this.bucket = new Bucket(this, "Storage", {
      encryption: BucketEncryption.KMS,
      encryptionKey: storageKey,
      bucketKeyEnabled: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    this.bucket.addLifecycleRule({
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
        this.bucket.arnForObjects(`AWSLogs/${organizationId}/${account}/*`),
      ],
      actions: ["s3:PutObject"],
      principals: [cloudTrailPrincipal],
      conditions: {
        StringEquals: { "s3:x-amz-acl": "bucket-owner-full-control" },
      },
    });
    this.bucket.addToResourcePolicy(bucketOrganizationPolicy);

    // Per the AWS documentation:
    // https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
    // https://docs.aws.amazon.com/awscloudtrail/latest/userguide/encrypting-cloudtrail-log-files-with-aws-kms.html
    // CloudTrail must be granted DescribeKey, Decrypt, and GenerateDataKey*.
    const cloudTrailStorageKeyGrant =
      storageKey.grantEncryptDecrypt(cloudTrailPrincipal);
    for (const statement of cloudTrailStorageKeyGrant.resourceStatements) {
      statement.addActions("kms:DescribeKey");
    }

    this.logGroup = new LogGroup(this, "LogGroup", {
      encryptionKey: storageKey,
      retention: logGroupRetentionDays || RetentionDays.ONE_MONTH,
    });

    // Per the AWS documentation:
    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
    // CloudWatch Logs must be granted Encrypt/Decrypt and Describe*.
    const logGroupPrincipal = new ServicePrincipal(
      `logs.${region}.amazonaws.com`
    );
    const cloudWatchLogsKeyGrant =
      storageKey.grantEncryptDecrypt(logGroupPrincipal);
    for (const statement of cloudWatchLogsKeyGrant.resourceStatements) {
      statement.addActions("kms:Describe*");
    }

    this.trail = new Trail(this, "Trail", {
      encryptionKey: storageKey,
      bucket: this.bucket,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: this.logGroup,
      isMultiRegionTrail: true,
      // You have to name the trail in order to use this property on the L2
      // isOrganizationTrail: true,
      // orgId: organizationId,
      // trailName: "NameOfYourTrail",
    });
    const cfnTrail = this.trail.node.defaultChild as CfnTrail;
    cfnTrail.addPropertyOverride("IsOrganizationTrail", true);

    for (const statement of cloudTrailStorageKeyGrant.resourceStatements) {
      statement.addCondition("StringLike", {
        "aws:SourceArn": `arn:aws:cloudtrail:${region}:${account}:trail/*`,
      });
    }
    for (const statement of cloudWatchLogsKeyGrant.resourceStatements) {
      statement.addCondition("ArnLike", {
        "kms:EncryptionContext:aws:logs:arn": `arn:aws:logs:${region}:${account}:log-group:*`,
      });
    }

    // For limiting the key usage to specific accounts.
    //   "StringLike": {
    //     "kms:EncryptionContext:aws:cloudtrail:arn": [
    //       "arn:aws:cloudtrail:*:account-id:trail/*"
    //     ]
    //   },
  }
}
