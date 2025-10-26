import type { FormProps } from "antd";
import { Button, Form, Input, Select, message } from "antd";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { create, type DescField } from "@bufbuild/protobuf";
import { createValidator } from "@bufbuild/protovalidate";
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

// Create the Connect transport
const transport = createConnectTransport({
  baseUrl: "http://localhost:8080",
});

// Create the client (Connect-ES v2 API)
const client = createClient(YCRPCService, transport);

// Create the validator
const validator = createValidator();

const SignupForm = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<FieldType>();

  const handleSubmit = async (values: FieldType) => {
    setLoading(true);
    try {
      // Create the protobuf message
      const request = create(SignupRequestSchema, {
        fullName: values.full_name,
        email: values.email,
        password: values.password,
        region: values.region,
      });

      // Validate using buf.validate rules from the proto file
      const validationResult = validator.validate(SignupRequestSchema, request);
      if (validationResult.kind !== "valid") {
        // Map protobuf validation errors to form fields
        const fieldErrors: Record<keyof FieldType, string[]> = {} as Record<
          keyof FieldType,
          string[]
        >;

        validationResult.violations?.forEach((violation) => {
          // Extract field name from the violation's field path
          // Path is an array where the first element contains the field
          const firstPathElement = violation.field[0];
          let protoFieldName: string | undefined;

          if (
            firstPathElement &&
            typeof firstPathElement === "object" &&
            "name" in firstPathElement
          ) {
            protoFieldName = firstPathElement.name;
          }

          // Map proto field names to form field names
          const fieldMap: Record<string, keyof FieldType> = {
            fullName: "full_name",
            full_name: "full_name",
            email: "email",
            password: "password",
            region: "region",
          };

          const formFieldName = protoFieldName
            ? fieldMap[protoFieldName]
            : undefined;

          if (formFieldName) {
            if (!fieldErrors[formFieldName]) {
              fieldErrors[formFieldName] = [];
            }
            fieldErrors[formFieldName].push(violation.message);
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
          form.setFields(formErrors);
        } else {
          message.error("Validation failed");
        }
        return;
      }

      // Call the backend API with the validated request
      const response = await client.signup(request);

      message.success(`Signup successful! Your handle is: ${response.handle}`);
      console.log("Signup response:", response);
    } catch (error: any) {
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
      } else {
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
    console.log("Failed:", errorInfo);
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
        rules={[{ required: true, message: "Please input your full name!" }]}
      >
        <Input placeholder="John Doe" />
      </Form.Item>

      <Form.Item<FieldType>
        label="Email"
        name="email"
        rules={[{ required: true, message: "Please input your email!" }]}
      >
        <Input placeholder="john.doe@example.com" />
      </Form.Item>

      <Form.Item<FieldType>
        label="Password"
        name="password"
        rules={[{ required: true, message: "Please input your password!" }]}
      >
        <Input.Password placeholder="Enter a strong password" />
      </Form.Item>

      <Form.Item<FieldType>
        label="Region"
        name="region"
        rules={[{ required: true, message: "Please select your region!" }]}
      >
        <Select placeholder="Select a region">
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
