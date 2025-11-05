"use client";
import { useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, Divider, IconButton, Tooltip, TextField, Chip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { UpdateEntry } from './updates';

const byDateDesc = (a: UpdateEntry, b: UpdateEntry) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

export default function UpdatesClient({ updates: input }: { updates: UpdateEntry[] }) {
  const updates = useMemo(() => [...input].sort(byDateDesc), [input]);
  const [filter, setFilter] = useState('');
  const filt = (v: string) => v.toLowerCase().includes(filter.toLowerCase());
  const list = filter ? updates.filter(u => filt(u.title) || filt(u.date) || (u.items||[]).some(it => filt(it))) : updates;
  const latest = list[0];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: 900 }}>
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center' }}>更新日志</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>最近发布的改进、修复与新功能。</Typography>
          <Divider />

          {latest && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" color="text.secondary">最新 · {latest.date}{latest.version? ` · ${latest.version}`:''}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{latest.title}</Typography>
                <Box component="ul" sx={{ m: 0, pl: 3 }}>
                  {latest.items.slice(0, 3).map((it, i) => (
                    <li key={i}><Typography variant="body2">{it}</Typography></li>
                  ))}
                </Box>
              </Stack>
            </Paper>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField size="small" placeholder="搜索（标题/内容/日期）" fullWidth value={filter} onChange={(e)=> setFilter(e.target.value)} />
            <Chip label={`共 ${list.length}`} size="small" />
          </Box>

          <Stack spacing={2}>
            {list.map((u, idx) => {
              const id = `${u.date}-${u.version||idx}`.replace(/[^a-zA-Z0-9-_.]/g,'');
              const copyLink = () => { try { navigator.clipboard?.writeText?.(`${location.origin}/updates#${id}`); } catch {} };
              return (
                <Paper key={`${u.date}-${idx}`} id={id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={0.5}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ flex:1 }}>
                        {u.date}{u.version ? ` · ${u.version}` : ''}
                      </Typography>
                      <Tooltip title="复制链接"><IconButton size="small" onClick={copyLink}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{u.title}</Typography>
                    <Box component="ul" sx={{ m: 0, pl: 3 }}>
                      {u.items.map((it, i) => (
                        <li key={i}><Typography variant="body2">{it}</Typography></li>
                      ))}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

