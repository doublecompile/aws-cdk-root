const { Stack, Duration } = require("aws-cdk-lib");
const { CloudTrailSetup } = require("./cloudtrail");

class RootAccountStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    const cloudTrailSetup = new CloudTrailSetup(this, "AuditLog", {});
  }
}

module.exports = { RootAccountStack };
