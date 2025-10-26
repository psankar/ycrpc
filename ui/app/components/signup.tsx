import type { FormProps } from "antd";
import { Button, Form, Input, Select, message } from "antd";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { YCRPCService, Region } from "../gen/ycrpc/v1/ycrpc_pb";
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

const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
  try {
    // Client-side validation
    if (!values.full_name || values.full_name.trim().length === 0) {
      message.error("Full name is required");
      return;
    }
    if (values.full_name.length > 100) {
      message.error("Full name must be at most 100 characters");
      return;
    }
    if (!/^[a-zA-Z\s\-\.]+$/.test(values.full_name)) {
      message.error(
        "Full name can only contain letters, spaces, hyphens, and periods"
      );
      return;
    }
    if (!values.password || values.password.length < 8) {
      message.error("Password must be at least 8 characters");
      return;
    }
    if (values.password.length > 128) {
      message.error("Password must be at most 128 characters");
      return;
    }
    if (values.region === Region.UNSPECIFIED) {
      message.error("Please select a valid region");
      return;
    }

    // Call the backend API
    const response = await client.signup({
      fullName: values.full_name,
      email: values.email,
      password: values.password,
      region: values.region,
    });

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
  }
};

const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (errorInfo) => {
  console.log("Failed:", errorInfo);
};

const SignupForm = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: FieldType) => {
    setLoading(true);
    try {
      await onFinish(values);
    } finally {
      setLoading(false);
    }
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
        rules={[
          { required: true, message: "Please input your full name!" },
          { min: 1, message: "Full name must be at least 1 character" },
          { max: 100, message: "Full name must be at most 100 characters" },
          {
            pattern: /^[a-zA-Z\s\-\.]+$/,
            message:
              "Full name can only contain letters, spaces, hyphens, and periods",
          },
        ]}
      >
        <Input placeholder="John Doe" />
      </Form.Item>

      <Form.Item<FieldType>
        label="Email"
        name="email"
        rules={[
          { required: true, message: "Please input your email!" },
          { type: "email", message: "Please enter a valid email address!" },
        ]}
      >
        <Input placeholder="john.doe@example.com" />
      </Form.Item>

      <Form.Item<FieldType>
        label="Password"
        name="password"
        rules={[
          { required: true, message: "Please input your password!" },
          { min: 8, message: "Password must be at least 8 characters" },
          { max: 128, message: "Password must be at most 128 characters" },
        ]}
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
