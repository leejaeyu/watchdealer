// components/CarouselShell.tsx
"use client";

import * as React from "react";
import { Box, IconButton, useTheme } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type Props = {
  children: React.ReactNode;
  ariaLabel?: string;
  /** 아이템 사이 간격(px). 기본 8 */
  gap?: number;
  /** 스냅 동작: "mandatory" | "proximity" (기본 proximity) */
  snap?: "mandatory" | "proximity";
  /** 버튼이 한 번에 이동할 거리. "page"면 컨테이너 width만큼. 숫자면 px. */
  step?: "page" | number;
  /** 버튼을 항상 표시할지 여부 (기본 false: 필요할 때만 표시) */
  alwaysShowArrows?: boolean;
  /** 컨테이너 상하 패딩(px). 기본 8 */
  paddingY?: number;
};

export default function CarouselShell({
  children,
  ariaLabel,
  gap = 8,
  snap = "proximity",
  step = "page",
  alwaysShowArrows = false,
  paddingY = 8,
}: Props) {
  const theme = useTheme();
  const ref = React.useRef<HTMLDivElement>(null);

  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  const clampEnds = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth - 1; // 여유치
    setAtStart(el.scrollLeft <= 0);
    setAtEnd(el.scrollLeft >= maxScroll);
    setIsOverflowing(el.scrollWidth > el.clientWidth + 2);
  }, []);

  React.useEffect(() => {
    clampEnds();
    const el = ref.current;
    if (!el) return;

    const onScroll = () => clampEnds();
    el.addEventListener("scroll", onScroll, { passive: true });

    // 리사이즈/컨텐츠 변화 대응
    const ro = new ResizeObserver(() => clampEnds());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [clampEnds]);

  // 마우스 휠로 가로 스크롤 (Shift 없이도)
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // 이미 가로면 패스
      // 세로 휠을 가로로 변환
      el.scrollBy({ left: e.deltaY, behavior: "smooth" });
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // 키보드 ← → 지원
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      doScroll(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      doScroll(-1);
    }
  };

  const doScroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const amount = step === "page" ? el.clientWidth * 0.9 : step;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const showLeft = (alwaysShowArrows || isOverflowing) && !atStart;
  const showRight = (alwaysShowArrows || isOverflowing) && !atEnd;

  return (
    <Box position="relative" onKeyDown={onKeyDown}>
      {/* 좌측 버튼 */}
      {showLeft && (
        <IconButton
          aria-label="왼쪽으로 이동"
          onClick={() => doScroll(-1)}
          size="small"
          sx={{
            position: "absolute",
            left: { xs: -6, sm: -8 },
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "background.paper",
            boxShadow: 1,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      )}

      {/* 스크롤 컨테이너 */}
      <Box
        ref={ref}
        role="list"
        aria-label={ariaLabel}
        tabIndex={0}
        sx={{
          mt: 1,
          display: "flex",
          gap: `${gap}px`,
          overflowX: "hidden",
          overflowY: "hidden",
          py: `${paddingY}px`,
          scrollSnapType: { xs: `x mandatory`, sm: `x ${snap}` },
          WebkitOverflowScrolling: "touch",
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "action.disabled",
            borderRadius: 999,
          },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          // 포커스 테두리
          outline: "none",
          "&:focus-visible": {
            boxShadow: `0 0 0 2px ${theme.palette.primary.main} inset`,
            borderRadius: 8,
          },
        }}
      >
        {children}
      </Box>

      {/* 우측 버튼 */}
      {showRight && (
        <IconButton
          aria-label="오른쪽으로 이동"
          onClick={() => doScroll(1)}
          size="small"
          sx={{
            position: "absolute",
            right: { xs: -6, sm: -8 },
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "background.paper",
            boxShadow: 1,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}
    </Box>
  );
}
