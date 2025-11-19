'use client';

import { useRef } from 'react';
import { Typography, Box, Container, Button, Paper, Stack, Divider, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BoltIcon from '@mui/icons-material/Bolt';
import InsightsIcon from '@mui/icons-material/Insights';
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Chess } from 'chess.js';
import { formatGameToDatabase } from '@/src/lib/chess';
import HomeGameLoader from './HomeGameLoader';
import HomeSelfAnalysisBoard from './HomeSelfAnalysisBoard';

export default function LandingPage() {
  const router = useRouter();
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Reusable helper to store a PGN and navigate to analyzer
  const analyzeGivenPgn = async (pgnText: string, meta?: { origin?: string; playerSide?: 'w' | 'b' }) => {
    if (!pgnText?.trim()) return;
    try {
      const g = new Chess();
      g.loadPgn(pgnText);
      const { openDB } = await import('idb');
      const db = await openDB('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
      const rec: any = { ...(formatGameToDatabase(g) as any), playerSide: meta?.playerSide ?? 'w', origin: meta?.origin ?? 'home', engineVariant: 'sf17-lite' };
      const id = (await db.add('games', rec)) as unknown as number;
      router.push(`/analyze?gameId=${id}`);
    } catch {
      router.push('/analyze');
    }
  };

  const scrollToPgn = () => {
    loaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar removed: navigation is handled by the new collapsible side nav */}

      {/* Hero with subtle gradient + glow */}
      <Box sx={{
        borderBottom: 1,
        borderColor: 'divider',
        backgroundImage: [
          'radial-gradient(800px 300px at 10% -10%, rgba(99,102,241,0.20), transparent 60%)',
          'radial-gradient(700px 260px at 90% -12%, rgba(236,72,153,0.18), transparent 55%)',
          'radial-gradient(1000px 500px at 50% -40%, rgba(14,165,233,0.12), transparent 65%)'
        ].join(', '),
      }}>
        <Container
          maxWidth="lg"
          sx={{
            py: { xs: 6, md: 8 },
          }}
        >
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' },
            gap: { xs: 6, lg: 8 },
            alignItems: 'center'
          }}>
            {/* Left Column: Text Content */}
            <Stack spacing={{ xs: 4, md: 5 }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Chip size="small" color="primary" label="Free" />
                  <Chip size="small" variant="outlined" label="Runs locally" />
                  <Chip size="small" variant="outlined" label="No sign-in" />
                </Stack>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: 36, md: 56 },
                    fontWeight: 800,
                    lineHeight: 1.1,
                    background: 'linear-gradient(90deg, #6366f1, #ec4899 50%, #06b6d4)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Master your games with Stockfish insights
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.125rem', maxWidth: 600 }}>
                  Play through ideas, run engine checks, and watch the evaluation bar update live. Everything runs in your browser – no account, no uploads.
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BoltIcon fontSize="small" color="primary" />
                    <Typography variant="body2">Stockfish 17 strength</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InsightsIcon fontSize="small" color="primary" />
                    <Typography variant="body2">Blunder alerts</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <OfflineBoltIcon fontSize="small" color="primary" />
                    <Typography variant="body2">Private & Fast</Typography>
                  </Stack>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<InsightsIcon />}
                    onClick={() => router.push('/analyze')}
                    sx={{ px: 4, py: 1.5, fontSize: '1.05rem' }}
                  >
                    Start analyzing
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    LinkComponent={Link}
                    href="/play"
                    sx={{ px: 4, py: 1.5, fontSize: '1.05rem' }}
                  >
                    Play Computer
                  </Button>
                </Stack>
              </Stack>
            </Stack>

            {/* Right Column: Game Loader */}
            <Box sx={{ position: 'relative' }}>
              {/* Decorative blur behind loader */}
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120%',
                height: '120%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
                zIndex: 0,
                pointerEvents: 'none',
              }} />
              <Paper
                ref={loaderRef}
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 3,
                  backdropFilter: 'blur(12px)',
                  backgroundColor: 'rgba(30, 41, 59, 0.7)', // Dark slate background
                  border: '1px solid rgba(255,255,255,0.1)', // Subtle border
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', // Deep shadow
                  position: 'relative',
                  zIndex: 1,
                  '.MuiTabs-root': { mb: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' },
                  '.MuiTab-root': { color: 'rgba(255,255,255,0.7)', '&.Mui-selected': { color: '#fff' } },
                  '.MuiInputBase-root': { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)' },
                  '.MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                  '.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                }}
              >
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: '#fff' }}>
                      Quick Import
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Load a game from PGN, Chess.com, or Lichess to start analyzing instantly.
                    </Typography>
                  </Box>
                  <HomeGameLoader
                    onAnalyzePGN={(text, source) => analyzeGivenPgn(text, { origin: source || 'chesscom' })}
                    onAnalyzeLocalPGN={(text) => analyzeGivenPgn(text, { origin: 'home' })}
                  />
                </Stack>
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Stack spacing={{ xs: 6, md: 8 }}>

          {/* Feature Section: Interactive Board */}
          <Stack spacing={6} alignItems="center">
            <Box sx={{ textAlign: 'center', maxWidth: 800 }}>
              <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 700, mb: 2 }}>
                Interactive Analysis Board
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.125rem', lineHeight: 1.7 }}>
                Don't just read lines—play them out. Our board lets you experiment with variations, visualize threats with arrows, and get instant feedback from Stockfish 17.
              </Typography>
            </Box>

            <Box sx={{ width: '100%', maxWidth: 1000 }}>
              <Paper variant="outlined" sx={{ p: 1, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <HomeSelfAnalysisBoard />
              </Paper>
            </Box>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
              gap: 3,
              width: '100%'
            }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Stack spacing={2}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.900', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <UploadFileIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>1. Import</Typography>
                    <Typography variant="body2" color="text.secondary">Paste PGN or fetch games directly from Chess.com or Lichess.</Typography>
                  </Box>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Stack spacing={2}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'secondary.900', color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <InsightsIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>2. Analyze</Typography>
                    <Typography variant="body2" color="text.secondary">Review key moments, find missed wins, and understand blunders.</Typography>
                  </Box>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Stack spacing={2}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'success.900', color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <BoltIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>3. Improve</Typography>
                    <Typography variant="body2" color="text.secondary">Learn from your mistakes and master new opening lines.</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          </Stack>

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, bgcolor: 'background.paper' }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto' }}>
                <Typography variant="h3" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 700, mb: 1 }}>
                  Why players pick Chess Analyzer
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Built for speed, privacy, and ease of use.
                </Typography>
              </Box>
              <Divider />
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                gap: 3
              }}>
                <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                  <BoltIcon color="primary" fontSize="large" />
                  <Typography variant="subtitle2" fontWeight={700}>Powerful Engine</Typography>
                  <Typography variant="body2" color="text.secondary">Stockfish 17 running locally via WebAssembly</Typography>
                </Stack>
                <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                  <InsightsIcon color="primary" fontSize="large" />
                  <Typography variant="subtitle2" fontWeight={700}>Deep Insights</Typography>
                  <Typography variant="body2" color="text.secondary">Visual arrows, eval bar, and multi-PV lines</Typography>
                </Stack>
                <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                  <OfflineBoltIcon color="primary" fontSize="large" />
                  <Typography variant="subtitle2" fontWeight={700}>100% Private</Typography>
                  <Typography variant="body2" color="text.secondary">Your games never leave your browser</Typography>
                </Stack>
                <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
                  <UploadFileIcon color="primary" fontSize="large" />
                  <Typography variant="subtitle2" fontWeight={700}>Easy Import</Typography>
                  <Typography variant="body2" color="text.secondary">Seamless PGN paste and file uploads</Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      {/* SEO Landing Content */}
      <Container maxWidth="lg" sx={{ py: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 700 }}>
          Chess Analysis Online Free: Powerful Chess Analysis Board With Engine
        </Typography>
        <Typography variant="body1">
          Welcome to our chess analysis platform. If you are looking for fast, accurate, and free chess analysis, you are in the right place. Our
          chess analysis board runs a modern engine in your browser and helps you review games, explore positions, and learn patterns. With PGN upload and copy-paste support, you can perform chess game analysis in seconds. Whether you come from chess.com analysis, lichess analysis, or other tools, this site focuses on clear feedback and practical study.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          What You Can Do With Chess Analysis
        </Typography>
        <Typography variant="body1">
          Use the chess analysis board to run engine lines, get best moves, and check evaluation shifts move by move. It is a free chess analysis engine that supports both complete chess game analysis and quick position analysis. You can paste a PGN for chess pgn analysis, or drop a single FEN to focus on chess position analysis. For players who want a free chess analysis website, our goal is a simple workflow: open the board, add your moves, and let the engine explain what matters.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          Import, Review, And Compare
        </Typography>
        <Typography variant="body1">
          Many users compare tools like chess.com analysis and lichess analysis. Our approach is lightweight and privacy friendly: analysis runs locally, so your data stays on your device. You can still export PGN to share or upload game to lichess for analysis if you want to continue on analysis board lichess. We aim to complement platforms you already use by giving you a fast, focused space for analysis chess without distractions.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          Features For Study And Training
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0 }}>
          <li>
            <Typography variant="body1">Free chess analysis with engine lines and an evaluation graph.</Typography>
          </li>
          <li>
            <Typography variant="body1">Chess engine analysis for openings, tactics, and endgames.</Typography>
          </li>
          <li>
            <Typography variant="body1">Chess AI analysis that suggests candidate moves and key mistakes.</Typography>
          </li>
          <li>
            <Typography variant="body1">Chess board analysis with arrows and centipawn scores.</Typography>
          </li>
          <li>
            <Typography variant="body1">Chess game analysis free, including multi-move blunder detection.</Typography>
          </li>
          <li>
            <Typography variant="body1">PGN chess analysis for tournament games and casual games.</Typography>
          </li>
          <li>
            <Typography variant="body1">Position analysis chess: drop into any position and explore.</Typography>
          </li>
          <li>
            <Typography variant="body1">A clean chess analysis board that loads instantly.</Typography>
          </li>
          <li>
            <Typography variant="body1"><strong>New:</strong> Integrated Lichess Explorer to view global opening stats and master games.</Typography>
          </li>
        </Box>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          Works With Your Favorite Sites And Databases
        </Typography>
        <Typography variant="body1">
          If you already study on chess.com, our tool helps you prepare before using chess.com analysis board or checking chess.com free analysis features. If you prefer lichess, you can use our integrated <strong>Lichess Explorer</strong> to check opening stats and master games instantly. We also parse PGNs from sources like 365chess analysis exports and other archives. No matter if you write analysis board chess notes by hand or import from online sites, you will get consistent engine feedback.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          How To Use Chess Analysis Effectively
        </Typography>
        <Typography variant="body1">
          Start with your last game and ask simple questions: where did the evaluation jump, and why? Our chess analysis graph shows momentum changes, while engine lines highlight concrete tactics. For live study, see how to do analysis a live chess game: recreate the critical position from memory, then run a quick engine check to confirm candidate moves. Over time, this routine builds intuition and turns analysis chess into a repeatable habit.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          PGN Upload, Sharing, And Reliability
        </Typography>
        <Typography variant="body1">
          You can perform chess pgn analysis by pasting the game or using the Upload PGN button above. After review, export the updated PGN and keep it in your notes or send it to a coach. Because the engine runs locally, the site stays fast and responsive, delivering chess free analysis even on long games.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          Compare: Chess.com Analysis And Lichess Analysis
        </Typography>
        <Typography variant="body1">
          There are excellent ecosystems around chess com analysis and analysis board lichess. Our tool is a neutral space to experiment, verify ideas, and then bring insights back to your favorite platform. Use it as a prep step before a tournament or as a daily trainer for pattern recognition.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Many players also look for game analysis chess, free analysis chess, chess.com analysis free, chess com analysis board, and analysis board lichess.org; our interface uses the same PGN and FEN standards so you can switch tools with zero friction.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          Fun Case Studies And Popular Searches
        </Typography>
        <Typography variant="body1">
          Curious about the viral messi ronaldo chess photo analysis? Recreate that famous position on the chess analysis board and see how the engine evaluates it. You can also analyze classic games from databases and explore wincraft chess analysis or other public collections. Whatever the source, consistent chess analysis builds confidence and accuracy.
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          Why Choose This Free Chess Analysis Website
        </Typography>
        <Typography variant="body1">
          We focus on clarity, speed, and control. This is a chess analysis online free tool with a clean interface and practical defaults. It supports chess com analysis free workflows, free chess.com analysis comparisons, and deep engine study without clutter. If you want free chess analysis with brilliant moves and explanations you can trust, start by uploading your PGN above and run your first review today.
        </Typography>
        {/* FAQ */}
        <Typography variant="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700 }}>
          FAQ: Chess Analysis, Live Study, And Engine Settings
        </Typography>
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">How do I do live chess game analysis?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1">
              For a live game on another site, open the analysis board here and mirror the moves on the board. You can also copy the running PGN from that site and paste it into the box above, then click Analyze PGN for instant engine feedback. During play on this site, use Open Game Analysis from the play screen to jump into engine analysis.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">What is the difference between PGN and FEN?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1">
              PGN (Portable Game Notation) stores the full chess game: headers (Event/Site/Date), the move list, and the final result. It is perfect for chess game analysis and sharing complete records. FEN (Forsyth–Edwards Notation) stores a single position only (piece placement, side to move, castling rights, etc.). Use PGN for full-game study and FEN for quick position analysis.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Where do I change engine settings?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1">
              On the analysis page, tap the floating Engine settings button to pick the engine, set depth, choose how many lines to show (MultiPV), and adjust workers (threads). Higher depth and more lines give stronger evaluation but use more CPU. If your device is modest, start with a lighter engine and depth 12–18.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Can I upload a PGN file instead of pasting?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1">
              Yes. Click Upload PGN above and select a .pgn file. The content will fill the box automatically. Then press Analyze PGN to open the chess analysis board with engine lines.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">How do I compare with chess.com analysis or lichess analysis?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body1">
              Export your PGN here and upload game to lichess for analysis, or import it into chess.com analysis. Our tool uses standard PGN and FEN so you can move seamlessly between platforms while keeping consistent results.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Typography variant="caption" color="text.secondary">
          Trademarks such as chess.com and lichess.org belong to their respective owners. This site is independent and provides a general-purpose chess analysis experience compatible with standard PGN and FEN formats.
        </Typography>
      </Container>

      <Box sx={{ py: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">© 2025 Chess Analyzer · Powered by Stockfish</Typography>
      </Box>
    </Box>
  );
}
