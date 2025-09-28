import { ThemeOptions } from "@mui/material/styles";
import components from "./components";

const common = {
  typography: {
    fontFamily: [
      "Pretendard",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),
    h1: { fontSize: "2rem", fontWeight: 700 },
    h2: { fontSize: "1.6rem", fontWeight: 700 },
    h3: { fontSize: "1.3rem", fontWeight: 700 },
    body1: { fontSize: "0.95rem" },
  },
  shape: { borderRadius: 14 },
  spacing: 8,
  components,
} satisfies ThemeOptions;

const lightTheme: ThemeOptions = {
  palette: {
    mode: "light",
    primary: { main: "#6C5CE7" },
    secondary: { main: "#00C2A8" },
    background: { default: "#F7F8FA", paper: "#FFFFFF" },
  },
  ...common,
};

export const darkTheme: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: { main: "#7B74FF" },
    secondary: { main: "#36E3CF" },
    background: { default: "#0F1115", paper: "#151821" },
  },
  ...common,
};

export default lightTheme;
