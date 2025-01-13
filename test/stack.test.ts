import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { RootAccountStack } from "../src/stack";

test("Snapshot", () => {
  const app = new App({ context: { OrganizationId: "o-123" } });
  const stack = new RootAccountStack(app, "test", {});

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
