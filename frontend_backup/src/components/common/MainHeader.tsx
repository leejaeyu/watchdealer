"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";

export default function MainHeader() {
  const [open, setOpen] = React.useState(false);
  const { user, logout } = useAuth();

  const toggle = (next?: boolean) => () =>
    setOpen((p) => (typeof next === "boolean" ? next : !p));

  // 드로어에서 로그아웃
  const handleLogout = async () => {
    await logout();
    setOpen(false);
  };

  return (
    <>
      {/* 래퍼 안에서만 고정되도록 sticky (layout.tsx에서 overflow:hidden으로 radius 유지) */}
      <AppBar
        position="sticky"
        elevation={0}
        color="default"
        sx={{
          bgcolor: "background.paper",
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 0, // ✅ 추가
          borderBottomRightRadius: 0, // ✅ 추가
        }}
      >
        <Toolbar
          sx={{ minHeight: { xs: 48, sm: 56, md: 64 }, px: { xs: 1.5, sm: 2 } }}
        >
          {/* 왼쪽: 로고 */}
          <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, letterSpacing: 0.2 }}
              >
                watchdealer
              </Typography>
            </Link>
          </Box>

          {/* 오른쪽: 비로그인 → 로그인/회원가입 버튼 + 햄버거 */}
          {!user ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button component={Link} href="/login" color="inherit">
                로그인
              </Button>
              <Button component={Link} href="/register" variant="contained">
                회원가입
              </Button>
              <IconButton edge="end" onClick={toggle()} aria-label="open menu">
                <MenuIcon />
              </IconButton>
            </Stack>
          ) : (
            // 로그인 → 알림벨 + "OO님 환영합니다" + 햄버거(드로어에 로그아웃)
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton aria-label="notifications">
                <Badge variant="dot" color="primary">
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>

              <Typography sx={{ display: { xs: "none", sm: "block" } }}>
                <b>{user.username}</b>님 환영합니다
              </Typography>

              <IconButton edge="end" onClick={toggle()} aria-label="open menu">
                <MenuIcon />
              </IconButton>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* 오른쪽 드로어 */}
      <Drawer
        anchor="right"
        open={open}
        onClose={toggle(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ "& .MuiDrawer-paper": { width: 280 } }}
      >
        <Toolbar />
        <List>
          {/* 공통 메뉴 */}
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/" onClick={toggle(false)}>
              <ListItemText primary="메인" />
            </ListItemButton>
          </ListItem>

          {!user ? (
            <>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/login"
                  onClick={toggle(false)}
                >
                  <ListItemText primary="로그인" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/register"
                  onClick={toggle(false)}
                >
                  <ListItemText primary="회원가입" />
                </ListItemButton>
              </ListItem>
            </>
          ) : (
            <>
              <ListItem disablePadding>
                <ListItemButton component={Link} href="/watchcompare">
                  <ListItemText primary="시계 가격비교" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={handleLogout}>
                  <ListItemText primary="로그아웃" />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>
      </Drawer>
    </>
  );
}
