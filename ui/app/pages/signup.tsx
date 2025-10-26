import SignupForm from "../components/signup";
import { Typography } from "antd";

const { Title } = Typography;

const SignupPage = () => (
  <div>
    <Title level={1}>Signup Page</Title>
    <SignupForm />
  </div>
);

export default SignupPage;
