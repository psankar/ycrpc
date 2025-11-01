import type { FormProps } from "antd";
import { Button, Form, Input, Select, message } from "antd";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { create } from "@bufbuild/protobuf";
import { createStandardSchema } from "@bufbuild/protovalidate";
import {
  YCRPCService,
  Region,
  SignupRequestSchema,
} from "../gen/ycrpc/v1/ycrpc_pb";
import { useState } from "react";

type FieldType = {
  full_name: string;
  email: string;
  password: string;
  region: Region;
};

// Define the StandardSchema Issue type locally (from the spec)
// The path can contain PathSegment objects in addition to PropertyKey
interface PathSegment {
  readonly key: PropertyKey;
}

interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
}

// Create the Connect transport
const transport = createConnectTransport({
  baseUrl: "http://localhost:8080",
});

// Create the client (Connect-ES v2 API)
const client = createClient(YCRPCService, transport);

// Create a StandardSchema-compliant validator
const signupSchema = createStandardSchema(SignupRequestSchema);

const SignupForm = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<FieldType>();

  const validateField = async (
    fieldName: keyof FieldType,
    protoFieldName: string,
    value: any
  ) => {
    // Don't validate empty values on blur; Ant Design's "required" rule handles that on submit.
    if (value === undefined || value === null || value === "") {
      form.setFields([{ name: fieldName, errors: [] }]);
      return;
    }

    // The protovalidate-ts library does not check min_len/max_len on partial
    // messages. To work around this, we must build a complete message, but we
    // only want to show errors for the field being blurred.
    // We fill other fields with valid dummy data to ensure the validator
    // performs a full check without reporting errors for other empty fields.
    const currentValues = form.getFieldsValue();
    const request = create(SignupRequestSchema, {
      fullName:
        protoFieldName === "fullName"
          ? value
          : currentValues.full_name || "Dummy Name", // Valid dummy
      email:
        protoFieldName === "email"
          ? value
          : currentValues.email || "dummy@dummy.com", // Valid dummy
      password:
        protoFieldName === "password"
          ? value
          : currentValues.password || "dummypassword", // Valid dummy
      region:
        protoFieldName === "region"
          ? value
          : currentValues.region || Region.USA, // Valid dummy
    });

    try {
      const resolvedResult = await Promise.resolve(
        signupSchema["~standard"].validate(request)
      );

      if ("issues" in resolvedResult && resolvedResult.issues) {
        // Filter for errors related ONLY to the current field.
        const fieldErrors = resolvedResult.issues
          .filter((issue: StandardSchemaIssue) => {
            const path = issue.path?.[0];
            return path === protoFieldName;
          })
          .map((issue: StandardSchemaIssue) => issue.message);

        form.setFields([{ name: fieldName, errors: fieldErrors }]);
      } else {
        // No issues found, clear any existing errors for the field.
        form.setFields([{ name: fieldName, errors: [] }]);
      }
    } catch (err) {
      console.error(
        `[validateField] An unexpected error occurred for ${fieldName}:`,
        err
      );
      form.setFields([
        { name: fieldName, errors: ["Validation check failed."] },
      ]);
    }
  };

  const handleSubmit = async (values: FieldType) => {
    console.log("[handleSubmit] Called with values:", values);
    setLoading(true);
    try {
      // Create the protobuf message
      const request = create(SignupRequestSchema, {
        fullName: values.full_name,
        email: values.email,
        password: values.password,
        region: values.region,
      });
      console.log("[handleSubmit] Created request:", request);

      // Validate using StandardSchema
      const validationResult = await Promise.resolve(
        signupSchema["~standard"].validate(request)
      );
      console.log("[handleSubmit] Validation result:", validationResult);

      if ("issues" in validationResult && validationResult.issues) {
        console.log(
          "[handleSubmit] Validation failed with issues:",
          validationResult.issues
        );
        // Map validation errors to form fields
        const fieldErrors: Record<string, string[]> = {};

        validationResult.issues.forEach((issue: StandardSchemaIssue) => {
          const path = issue.path?.[0];
          let formFieldName: keyof FieldType | undefined;

          if (path === "full_name") {
            formFieldName = "full_name";
          } else if (path === "email") {
            formFieldName = "email";
          } else if (path === "password") {
            formFieldName = "password";
          } else if (path === "region") {
            formFieldName = "region";
          }

          if (formFieldName) {
            if (!fieldErrors[formFieldName]) {
              fieldErrors[formFieldName] = [];
            }
            fieldErrors[formFieldName].push(issue.message);
          }
        });

        // Set field errors on the form
        const formErrors = Object.entries(fieldErrors).map(
          ([name, errors]) => ({
            name: name as keyof FieldType,
            errors,
          })
        );

        if (formErrors.length > 0) {
          console.log("[handleSubmit] Setting form errors:", formErrors);
          form.setFields(formErrors);
        } else {
          console.log(
            "[handleSubmit] Validation failed but no field errors mapped"
          );
          message.error("Validation failed");
        }
        return;
      }

      console.log("[handleSubmit] Validation passed, calling backend API");
      // Call the backend API with the validated request
      const response = await client.signup(request);
      console.log("[handleSubmit] Backend response:", response);

      message.success(`Signup successful! Your handle is: ${response.handle}`);
      console.log("Signup response:", response);
    } catch (error: any) {
      console.error("[handleSubmit] Error caught:", error);
      // Handle Connect errors
      if (error.code) {
        if (error.code === "invalid_argument") {
          const details = error.details || [];
          const invalidFields = details.find((d: any) => d.fields);
          if (invalidFields) {
            message.error(`Invalid fields: ${invalidFields.fields.join(", ")}`);
          } else {
            message.error(error.message || "Invalid request");
          }
        } else if (error.code === "already_exists") {
          message.error(error.message || "User already exists");
        } else {
          message.error(`Error: ${error.message || "Unknown error"}`);
        }
      }
      else {
        message.error("Failed to signup. Please try again.");
        console.error("Signup error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (
    errorInfo
  ) => {
    console.log("[onFinishFailed] Form validation failed:", errorInfo);
  };

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      onFinishFailed={onFinishFailed}
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      style={{ maxWidth: 600 }}
      autoComplete="off"
    >
      <Form.Item<FieldType>
        label="Full Name"
        name="full_name"
        validateStatus=""
        hasFeedback
      >
        <Input
          placeholder="John Doe"
          onBlur={(e) =>
            void validateField("full_name", "full_name", e.target.value)
          }
        />
      </Form.Item>

      <Form.Item<FieldType>
        label="Email"
        name="email"
        validateStatus=""
        hasFeedback
      >
        <Input
          placeholder="john.doe@example.com"
          onBlur={(e) => void validateField("email", "email", e.target.value)}
        />
      </Form.Item>

      <Form.Item<FieldType>
        label="Password"
        name="password"
        validateStatus=""
        hasFeedback
      >
        <Input.Password
          placeholder="Enter a strong password"
          onBlur={(e) =>
            void validateField("password", "password", e.target.value)
          }
        />
      </Form.Item>

      <Form.Item<FieldType>
        label="Region"
        name="region"
        validateStatus=""
        hasFeedback
      >
        <Select
          placeholder="Select a region"
          onBlur={() =>
            void validateField("region", "region", form.getFieldValue("region"))
          }
          onChange={(value) => form.setFieldValue("region", value)}
        >
          <Select.Option value={Region.USA}>USA</Select.Option>
          <Select.Option value={Region.EUR}>Europe</Select.Option>
          <Select.Option value={Region.IND}>India</Select.Option>
          <Select.Option value={Region.SGP}>Singapore</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label={null}>
        <Button type="primary" htmlType="submit" loading={loading}>
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SignupForm;
