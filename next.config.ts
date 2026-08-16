import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "nfsu-iscms",
  project: "iscms-web",
});
