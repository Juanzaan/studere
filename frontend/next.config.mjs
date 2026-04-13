import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  
  return {
    distDir: isDev ? ".next-dev" : ".next",
    
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
