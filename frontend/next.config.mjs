/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  
  // --- ADD THIS LINE TO FIX RELOAD BAILOUTS ---
  trailingSlash: true, 
};

export default nextConfig;