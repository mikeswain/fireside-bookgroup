import type { NextConfig } from "next";
import { execSync } from "child_process";

const gitCommit = execSync("git rev-parse --short HEAD").toString().trim();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
  },
};

export default nextConfig;
