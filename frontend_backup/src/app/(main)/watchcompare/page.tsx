"use client";

import * as React from "react";
import { Box, Stack, Typography, Button, Snackbar } from "@mui/material";
import MuiAlert, {
  type AlertProps,
  type AlertColor,
} from "@mui/material/Alert";
import AddTransactionDialog from "./AddTransactionDialog";
import WatchBrowser from "./WatchBrowser";
/** 스낵바용 Alert (forwardRef) */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function WatchDataAdminPage() {
  const [open, setOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{
    msg: string;
    sev: AlertColor;
  } | null>(null);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, mx: "auto" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5" fontWeight={800}>
          시계 데이터 관리 (운영자)
        </Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          시계 정보 추가 +
        </Button>
      </Stack>

      <AddTransactionDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => setToast({ msg: "시계 등록 완료", sev: "success" })}
      />
      <WatchBrowser />

      {toast && (
        <Snackbar
          open
          autoHideDuration={1800}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <MuiAlert
            elevation={6}
            variant="filled"
            severity={toast.sev}
            onClose={() => setToast(null)}
            sx={{ width: "100%" }}
          >
            {toast.msg}
          </MuiAlert>
        </Snackbar>
      )}
    </Box>
  );
}
