// next.config.js (CJS)
module.exports = {
  images: {
    remotePatterns: [
      // 개발용 Django
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      }, // 필요시

      // 운영용(예시) - 실제 API_ORIGIN/도메인으로 바꾸세요
      {
        protocol: "http",
        hostname: "15.164.28.224",
        port: "8000",
        pathname: "/**",
      },
      // { protocol: "https", hostname: "api.yourdomain.com",           pathname: "/**" },
    ],
  },
};
