import React from 'react';
import { Box, Typography, Paper, Stack, Accordion, AccordionSummary, AccordionDetails, Button, Divider, Chip } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import VerticalAlignTopRoundedIcon from '@mui/icons-material/VerticalAlignTopRounded';
import Link from 'next/link';

export default function ExploreLandingContent() {
    return (
        <Box sx={{ mt: 8, mb: 4, maxWidth: 1000, mx: 'auto', px: 2 }}>

            {/* HEADER SECTION */}
            <Box sx={{ mb: 6, textAlign: 'left' }}>
                <Typography variant="h4" sx={{
                    fontWeight: 800,
                    mb: 2,
                    background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Why This Position Explorer Matters for Chess Analysis
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    This page is built for chess analysis. It lets you explore real-game move choices from large open datasets and see which lines perform best. Compared with a pure engine, data-driven chess analysis helps you understand what humans actually play online and over-the-board, and which practical options score well in real games.
                </Typography>
            </Box>

            {/* KEY FEATURES & WHO IS IT FOR */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
                <Box flex={1}>
                    <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3, bgcolor: 'background.paper' }}>
                        <Stack spacing={2}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <SortRoundedIcon color="primary" />
                                <Typography variant="h6" fontWeight={700}>Key Features</Typography>
                            </Stack>
                            <Stack spacing={1.5}>
                                {[
                                    "Access 100M+ online games and 2M+ Masters games for pro-level data.",
                                    "Filter by time control (Blitz, Rapid, Classical) and rating range.",
                                    "Mini book tree to preview lines quickly (no engine required).",
                                    "Practice queue to convert findings into drills in one click."
                                ].map((text, i) => (
                                    <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                                        <CheckRoundedIcon sx={{ fontSize: 18, mt: 0.5, color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">{text}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Stack>
                    </Paper>
                </Box>
                <Box flex={1}>
                    <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3, bgcolor: 'background.paper' }}>
                        <Stack spacing={2}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <InfoOutlinedIcon color="secondary" />
                                <Typography variant="h6" fontWeight={700}>Who Is It For</Typography>
                            </Stack>
                            <Stack spacing={1.5}>
                                {[
                                    "Players who want free chess analysis without sign-in.",
                                    "Opening learners who need a fast, data-first view before engine analysis.",
                                    "Coaches preparing model lines and practice tasks for students."
                                ].map((text, i) => (
                                    <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                                        <CheckRoundedIcon sx={{ fontSize: 18, mt: 0.5, color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">{text}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Stack>
                    </Paper>
                </Box>
            </Stack>

            {/* HOW IT WORKS */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>How It Works</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    We connect directly to a global chess database to bring you real-time opening statistics. When you paste a FEN above, the explorer fetches the most played continuations from millions of online and master games. You can preview a line, add it to practice, or open a model game in the full Analyzer. For engine-powered chess analysis, head to <Link href="/analyze" style={{ color: '#0ea5e9', textDecoration: 'none' }}>/ANALYZE</Link> where Stockfish provides multi-PV evaluations.
                </Typography>
            </Paper>

            {/* QUICK START GUIDE */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Quick Start Guide</Typography>
                <Stack spacing={3}>
                    {[
                        { title: "Paste a FEN position", desc: "Paste a FEN above (or click an example) and press Apply to analyze any chess position." },
                        { title: "Review top moves", desc: "Scan Top Moves: higher games = more popular; higher win% = better results." },
                        { title: "Filter the database", desc: "Use the 'Filters & FEN' button to switch between Online/Masters DB and filter by rating/speed." },
                        { title: "Practice or analyze deeper", desc: "Open a model game in the Analyzer for engine-based chess analysis, or add to practice queue." }
                    ].map((item, i) => (
                        <Stack key={i} direction="row" spacing={2}>
                            <Box sx={{
                                minWidth: 24, height: 24, borderRadius: '50%', bgcolor: '#06b6d4', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
                            }}>
                                {i + 1}
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>{item.title}</Typography>
                                <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                            </Box>
                        </Stack>
                    ))}
                </Stack>
            </Paper>

            {/* HOW TO READ STATISTICS */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>How To Read The Statistics</Typography>
                <Stack spacing={3}>
                    <Stack direction="row" spacing={2}>
                        <BarChartRoundedIcon color="primary" />
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700}>Games</Typography>
                            <Typography variant="body2" color="text.secondary">Sample size for that move from real games (higher = more reliable).</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TrackChangesRoundedIcon color="error" />
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700}>Win%</Typography>
                            <Typography variant="body2" color="text.secondary">Expected result for the side to move in this position (computed from results).</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <AccountTreeRoundedIcon color="success" />
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700}>Mini Book</Typography>
                            <Typography variant="body2" color="text.secondary">A compact tree to sense the next 1–2 moves and typical plans.</Typography>
                        </Box>
                    </Stack>
                </Stack>
            </Paper>

            {/* PRACTICE IN 30 SECONDS */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Practice In 30 Seconds</Typography>
                <Stack spacing={3}>
                    {[
                        "Click **Practice Now (5)** to auto-create five drills from the current position",
                        "Hit **Start Practice** to jump into retry mode and test yourself",
                        "Repeat for your favorite openings until the moves feel automatic"
                    ].map((text, i) => (
                        <Stack key={i} direction="row" spacing={2} alignItems="center">
                            <Box sx={{
                                minWidth: 24, height: 24, borderRadius: '50%', bgcolor: '#d8b4fe', color: '#6b21a8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
                            }}>
                                {i + 1}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {text.split('**').map((part, idx) => idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part)}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Paper>

            {/* COVERAGE & LIMITATIONS */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Coverage & Limitations</Typography>
                <Stack spacing={1.5}>
                    {[
                        "Data is fetched in real-time from the cloud. Small samples can be noisy—prefer higher game counts.",
                        "Masters Database contains over 2 million OTB games from 1952 to present.",
                        "Use engine analysis for sharp tactics or when results disagree across sources."
                    ].map((text, i) => (
                        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                            <WarningAmberRoundedIcon sx={{ fontSize: 18, mt: 0.5, color: '#fbbf24' }} />
                            <Typography variant="body2" color="text.secondary">{text}</Typography>
                        </Stack>
                    ))}
                </Stack>
            </Paper>

            {/* WHY PLAYERS LOVE THIS TOOL */}
            <Paper elevation={0} sx={{
                p: 3, mb: 3, borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
            }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Why players love this tool</Typography>
                <Stack spacing={1.5}>
                    {[
                        "Data-first chess analysis: see what people actually play and what succeeds.",
                        "Fast previews and a clean opening tree for immediate understanding.",
                        "One-click flow to engine analysis and practice—no accounts, free to use."
                    ].map((text, i) => (
                        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                            <CheckRoundedIcon sx={{ fontSize: 18, mt: 0.5, color: 'rgba(255,255,255,0.8)' }} />
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>{text}</Typography>
                        </Stack>
                    ))}
                </Stack>
            </Paper>

            {/* FAQ */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Frequently Asked Questions</Typography>
                <Stack spacing={1}>
                    <Accordion elevation={0} disableGutters sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" fontWeight={600}>Is this a chess analysis engine or a database?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                It is a data-driven explorer. For engine chess analysis, open a position here and then use our Analyzer page with Stockfish. Together they create a complete chess analysis workflow.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                    <Divider />
                    <Accordion elevation={0} disableGutters sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" fontWeight={600}>Is it free to use?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                Yes. The position explorer and the Analyzer provide free chess analysis features. No sign-in is required.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                    <Divider />
                    <Accordion elevation={0} disableGutters sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" fontWeight={600}>How does this compare to lichess analysis or chess.com analysis?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                This tool focuses on a streamlined, distraction-free exploration experience with unique features like "Practice Drills" and a "Mini Book" view. It uses the same open global database but presents it in a way optimized for quick learning and repertoire building.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                    <Divider />
                    <Accordion elevation={0} disableGutters sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" fontWeight={600}>Can I practice the lines I find?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                Yes. Add top moves to your practice queue and start training in one click. It turns chess analysis into spaced practice.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </Stack>
            </Paper>

            {/* FOOTER BUTTONS */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<PlayArrowRoundedIcon />}
                    onClick={() => window.location.href = '/analyze'}
                    sx={{
                        bgcolor: '#06b6d4',
                        '&:hover': { bgcolor: '#0891b2' },
                        color: 'white',
                        fontWeight: 700,
                        py: 1.5
                    }}
                >
                    OPEN CHESS ANALYZER
                </Button>
                <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<VerticalAlignTopRoundedIcon />}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    sx={{
                        borderColor: 'divider',
                        color: 'text.secondary',
                        fontWeight: 700,
                        py: 1.5
                    }}
                >
                    BACK TO TOP
                </Button>
            </Stack>

        </Box>
    );
}
