"use client";
import { Box } from "@mui/material";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

export default function GraphMini({ series }: { series: { ply: number; cp: number }[] }) {
  if (!series?.length) return null;
  return (
    <Box sx={{ width: '100%', height: 120, bgcolor: 'grey.900', borderRadius: 2, px: 1 }}>
      <ResponsiveContainer>
        <AreaChart data={series} margin={{ top: 6, left: 0, right: 0, bottom: 0 }}>
          <XAxis dataKey="ply" hide tick={{ fontSize: 10 }} />
          <YAxis domain={[-800,800]} hide />
          <Tooltip formatter={(v:any)=> (Number(v)/100).toFixed(2)} labelFormatter={(l:any)=> `Ply ${l}`} />
          <ReferenceLine y={0} stroke="#888" />
          <Area type="monotone" dataKey="cp" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

