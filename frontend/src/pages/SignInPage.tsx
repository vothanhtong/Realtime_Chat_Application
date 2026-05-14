import { SigninForm } from "@/components/auth/signin-form";

const SignInPage = () => {
  return (
    <div className="auth-page-bg min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-[420px]">
        <SigninForm />
      </div>
    </div>
  );
};

export default SignInPage;
