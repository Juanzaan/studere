import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: "#C9B99A" }}>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#2C1810",
            colorBackground: "#D8C9AD",
            colorInput: "#F3EEDF",
            colorDanger: "#8B3A3A",
            borderRadius: "0.375rem",
          },
        }}
      />
    </div>
  );
}
