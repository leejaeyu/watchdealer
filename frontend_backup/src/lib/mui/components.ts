import { Components, Theme } from "@mui/material/styles";

const components: Components<Theme> = {
  MuiButton: {
    defaultProps: { disableElevation: true, size: "medium" },
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: theme.shape.borderRadius,
        textTransform: "none",
        fontWeight: 700,
      }),
      containedPrimary: ({ theme }: { theme: Theme }) => ({
        ":hover": { filter: "brightness(1.05)" },
      }),
    },
  },

  MuiTextField: {
    defaultProps: { variant: "outlined" },
  },

  MuiPaper: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: theme.shape.borderRadius,
      }),
    },
  },

  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: `${theme.shape.borderRadius}px`,
      }),
    },
  },
};

export default components;
