// MUI theme options mirroring the CSS tokens in styles/base.scss.
// Each app passes these to its own createTheme(), so this file has no imports.
export const themeOptions = {
  palette: {
    primary: { main: "#222222", dark: "#000000", light: "#f2f2f2" },
    secondary: { main: "#e51d53" },
    success: { main: "#008a05" },
    warning: { main: "#b4690e" },
    error: { main: "#c13515" },
    info: { main: "#0b5fae" },
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: "#222222", secondary: "#6a6a6a" },
    divider: "#ebebeb",
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Figtree", system-ui, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8, paddingInline: 18 } },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: { borderRadius: 12 },
        elevation1: {
          boxShadow: "0 1px 2px rgba(0,0,0,.08)",
          border: "1px solid #ebebeb",
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: "1px solid #ebebeb", borderRadius: 12 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#b0b0b0" },
        },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
};
