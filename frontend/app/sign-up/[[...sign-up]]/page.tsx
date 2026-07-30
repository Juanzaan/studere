import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: "#C9B99A" }}>
      <SignUp
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
