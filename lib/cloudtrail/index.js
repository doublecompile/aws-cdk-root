const { Construct } = require("constructs");
const { Trail } = require("aws-cdk-lib/aws-cloudtrail");

const TRAIL = Symbol("trail");

/**
 * The setup for CloudTrail.
 */
class CloudTrailSetup extends Construct {
  /**
   * @param {constructs.Construct} scope - The scope in which to define this construct.
   * @param {string} id - The scoped construct ID.
   * @param {Object} props - The properties.
   */
  constructor(scope, id, props = {}) {
    super(scope, id);

    this[TRAIL] = new Trail(this, "trail");
  }

  /**
   * @return {aws-cdk-lib/cloudtrail.Trail} The CloudTrail trail construct.
   */
  get trail() {
    return this[TRAIL];
  }
}

module.exports = { CloudTrailSetup };
