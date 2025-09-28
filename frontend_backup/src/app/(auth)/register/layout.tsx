"use client";
import Link from "next/link";
import { Tabs, Tab, Box } from "@mui/material";
import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const value = pathname?.includes("/dealer") ? 1 : 0;
  return (
    <Box mt={4}>
      <Tabs value={value} centered>
        <Tab label="일반인 가입" component={Link} href="/register/user" />
        <Tab label="딜러 가입" component={Link} href="/register/dealer" />
      </Tabs>
      {children}
    </Box>
  );
}
