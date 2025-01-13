import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CloudTrailSetup } from "./cloudtrail";

export class RootAccountStack extends Stack {
  /**
   *
   * @param scope - The parent construct
   * @param id - The construct ID
   * @param props - The construct properties
   */
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new CloudTrailSetup(this, "AuditLog", {
      organizationId: this.node.tryGetContext("OrganizationId"),
    });
  }
}
