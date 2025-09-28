import type { Metadata } from "next";
import ThemeRegistry from "@/lib/mui/ThemeRegistry";
import { AuthProvider } from "@/auth/AuthContext";
import MainHeader from "@/components/common/MainHeader";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";

export const metadata: Metadata = {
  title: "watchdealer",
  description: "auth demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" style={{ height: "100vh", overflow: "hidden" }}>
      <body
        style={{
          height: "100vh",
          overflow: "hidden", // ✅ 바깥 스크롤 막기
          margin: 0,
          display: "flex",
          justifyContent: "center",
          background: "#f4f4f4",
        }}
      >
        <ThemeRegistry>
          <AuthProvider>
            {/* 사이트 전체 래퍼: 태블릿 크기 고정 */}
            <Box
              sx={{
                width: "100%",
                maxWidth: 960,
                height: "100vh", // ✅ 래퍼 높이 고정
                bgcolor: "background.default",
                boxShadow: 2,
                borderRadius: 0,
                overflow: "hidden", // 헤더 radius 살리기 + 내부 스크롤만
                display: "flex",
                flexDirection: "column",
              }}
            >
              <MainHeader />

              {/* ✅ 스크롤은 여기(main)에서만 */}
              <Box
                component="main"
                sx={{
                  flex: 1,
                  minHeight: 0, // flex 자식 스크롤 되게 하는 핵심
                  overflowY: "auto",
                  pt: 2,
                  pb: 6,
                }}
              >
                <Container maxWidth={false}>{children}</Container>
              </Box>
            </Box>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
