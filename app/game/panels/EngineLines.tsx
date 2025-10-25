"use client";
import { Stack, Typography, Box, IconButton, Tooltip } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { moveLineUciToSan } from "@/src/lib/chess";

type Line = { pv?: string; depth?: number; multiPv?: number; score?: number; mate?: number };

function evalLabel(score?: number, mate?: number) {
  if (typeof mate === "number") {
    // Normalize mate 0 to neutral display
    const m = Math.abs(mate);
    const sign = mate > 0 ? "+" : mate < 0 ? "-" : "";
    return `${sign}M${m}`;
  }
  if (typeof score === "number") return `${score >= 0 ? "+" : ""}${(score / 100).toFixed(2)}`;
  return "?";
}

export default function EngineLines({ lines, fen }: { lines: Line[]; fen: string }) {
  if (!lines?.length) return (
    <Typography variant="body2" color="text.secondary">No analysis yet. Make a move or load a game.</Typography>
  );

  const toSan = moveLineUciToSan(fen);

  return (
    <Stack spacing={1.2}>
      {lines.map((li, idx) => {
        const uci = (li.pv || "").split(" ").filter(Boolean);
        const san = uci.map(toSan).join(" ");
        return (
          <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ px: 0.75, py: 0.25, bgcolor: 'grey.800', borderRadius: 1, fontSize: 12, fontWeight: 700 }}>
              {evalLabel(li.score, li.mate)}
            </Box>
            <Typography variant="body2" sx={{ wordBreak: 'break-word', flex: 1 }}>{san}</Typography>
            <Tooltip title="Copy PV"><span><IconButton size="small" onClick={()=> navigator.clipboard.writeText((san||"").trim())}><ContentCopyRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
          </Stack>
        );
      })}
    </Stack>
  );
}

