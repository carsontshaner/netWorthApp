import { Redirect } from 'expo-router';

// "Sign in" navigates here from the landing screen.
// We redirect directly to the email entry screen since the
// OTP flow handles both new sign-ups and returning users.
export default function SignInScreen() {
  return <Redirect href="/auth/email" />;
}
