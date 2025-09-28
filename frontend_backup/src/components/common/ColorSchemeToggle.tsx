"use client";

import * as React from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { LightMode, DarkMode } from "@mui/icons-material";
import { ColorSchemeContext } from "@/lib/mui/ThemeRegistry";

export default function ColorSchemeToggle() {
  const { mode, toggle } = React.useContext(ColorSchemeContext);
  return (
    <Tooltip title={mode === "light" ? "다크모드" : "라이트모드"}>
      <IconButton
        onClick={toggle}
        aria-label="toggle color scheme"
        size="small"
      >
        {mode === "light" ? (
          <DarkMode fontSize="small" />
        ) : (
          <LightMode fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
