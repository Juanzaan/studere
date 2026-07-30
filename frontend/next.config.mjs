import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  
  return {    distDir: isDev ? ".next-dev" : ".next",
    
    // Clerk authentication environment variables
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y29uY2lzZS10ZXJtaXRlLTU2LmNsZXJrLmFjY291bnRzLmRldiQ",
      CLERK_SECRET_KEY: "sk_test_qNi3EvgC4SqaWU7so2hZNLvWcIrdxqBsG0unJntn77",
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: "/dashboard",
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: "/dashboard",
    },

    

    // Transpile packages for compatibility
    transpilePackages: [
      "react-markdown",
      "remark-math",
      "remark-gfm",
      "rehype-katex",
      "rehype-highlight",
    ],
    
    // Compiler optimizations
    compiler: {
      removeConsole: !isDev ? {
        exclude: ["error", "warn"],
      } : false,
    },
    
    // Production optimizations
    ...(!isDev && {
      compress: true,
      poweredByHeader: false,
      generateEtags: true,
    }),
    
    // Experimental features
    experimental: {
      typedRoutes: false,
    },
  };
}
