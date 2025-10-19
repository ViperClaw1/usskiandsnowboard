import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface ConfirmationEmailProps {
  supabase_url: string;
  token_hash: string;
  redirect_to: string;
  user_email: string;
}

export const ConfirmationEmail = ({
  token_hash,
  supabase_url,
  redirect_to,
  user_email,
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirm your U.S. Ski & Snowboard account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to U.S. Ski & Snowboard!</Heading>
        <Text style={text}>
          Thank you for signing up with <strong>{user_email}</strong>.
        </Text>
        <Text style={text}>
          To complete your registration and access your dashboard, please confirm your email address by clicking the button below:
        </Text>
        <Link
          href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=email&redirect_to=${redirect_to}`}
          target="_blank"
          style={button}
        >
          Confirm Email Address
        </Link>
        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={code}>
          {`${supabase_url}/auth/v1/verify?token=${token_hash}&type=email&redirect_to=${redirect_to}`}
        </Text>
        <Text style={{ ...text, color: '#ababab', marginTop: '14px' }}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={footer}>
          U.S. Ski & Snowboard - Connecting Athletes with Career Opportunities
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ConfirmationEmail;

const main = {
  backgroundColor: '#ffffff',
};

const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
};

const h1 = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const text = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  margin: '24px 0',
};

const button = {
  backgroundColor: '#0066cc',
  borderRadius: '5px',
  color: '#fff',
  display: 'inline-block',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '50px',
  textAlign: 'center' as const,
  textDecoration: 'none',
  width: '100%',
  padding: '0 20px',
  margin: '24px 0',
};

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
};

const footer = {
  color: '#898989',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
};
