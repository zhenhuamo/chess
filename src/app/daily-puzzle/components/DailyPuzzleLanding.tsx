'use client';

import { Box, Container, Grid, Paper, Typography, Stack, Button } from '@mui/material';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import ExtensionIcon from '@mui/icons-material/Extension';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function DailyPuzzleLanding() {
    return (
        <Box sx={{ py: 8, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
                {/* Hero Section */}
                <Box sx={{ mb: 8, textAlign: 'center' }}>
                    <Typography variant="h3" component="h1" fontWeight={800} gutterBottom sx={{
                        background: 'linear-gradient(45deg, #90caf9 30%, #ce93d8 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Master Chess with Advanced Analysis Tools
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
                        Elevate your game using our comprehensive <strong>advanced analysis</strong> platform.
                        Whether you're a beginner or a master, our tools provide the insights you need to improve.
                    </Typography>
                </Box>

                {/* Features Grid */}
                <Grid container spacing={4} sx={{ mb: 8 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 4, height: '100%', bgcolor: 'background.paper', borderRadius: 4 }}>
                            <Stack spacing={2}>
                                <Box sx={{ p: 1.5, bgcolor: 'primary.dark', width: 'fit-content', borderRadius: 2 }}>
                                    <AutoGraphIcon sx={{ color: 'white' }} />
                                </Box>
                                <Typography variant="h5" fontWeight={700}>
                                    Deep Analysis
                                </Typography>
                                <Typography color="text.secondary">
                                    Powered by the robust <strong>Stockfish</strong> engine, get deep insights into every move.
                                    Understand the "why" behind the best moves and learn from your mistakes with instant feedback.
                                </Typography>
                            </Stack>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 4, height: '100%', bgcolor: 'background.paper', borderRadius: 4 }}>
                            <Stack spacing={2}>
                                <Box sx={{ p: 1.5, bgcolor: 'secondary.dark', width: 'fit-content', borderRadius: 2 }}>
                                    <ExtensionIcon sx={{ color: 'white' }} />
                                </Box>
                                <Typography variant="h5" fontWeight={700}>
                                    Daily Puzzles
                                </Typography>
                                <Typography color="text.secondary">
                                    Sharpen your tactical vision with our curated daily puzzles.
                                    Perfect for quick training sessions, these puzzles help you spot patterns and improve your calculation speed.
                                </Typography>
                            </Stack>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 4, height: '100%', bgcolor: 'background.paper', borderRadius: 4 }}>
                            <Stack spacing={2}>
                                <Box sx={{ p: 1.5, bgcolor: 'success.dark', width: 'fit-content', borderRadius: 2 }}>
                                    <SchoolIcon sx={{ color: 'white' }} />
                                </Box>
                                <Typography variant="h5" fontWeight={700}>
                                    Free Chess Analysis
                                </Typography>
                                <Typography color="text.secondary">
                                    Access professional-grade tools without the cost.
                                    Our <strong>free chess analysis</strong> features ensure that high-quality training is accessible to everyone.
                                </Typography>
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Detailed Content Section */}
                <Grid container spacing={6} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            Why Use Our Chess Analysis Board?
                        </Typography>
                        <Stack spacing={2} sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <CheckCircleIcon color="primary" />
                                <Typography>
                                    <strong>Interactive Learning:</strong> Use our interactive <strong>chess analysis board</strong> to explore variations and test your ideas in real-time.
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <CheckCircleIcon color="primary" />
                                <Typography>
                                    <strong>Engine Evaluation:</strong> Get instant evaluation of your position. See winning probabilities and find the best continuations.
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <CheckCircleIcon color="primary" />
                                <Typography>
                                    <strong>Opening Explorer:</strong> Study opening lines and see what the masters play in similar positions.
                                </Typography>
                            </Box>
                        </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Typography variant="h5" fontWeight={700} gutterBottom>
                                How to Improve
                            </Typography>
                            <Typography paragraph color="text.secondary">
                                1. <strong>Solve Daily Puzzles:</strong> Start your day with a tactical warm-up.
                            </Typography>
                            <Typography paragraph color="text.secondary">
                                2. <strong>Analyze Your Games:</strong> Import your games and use the <strong>chess analysis free</strong> tools to find missed opportunities.
                            </Typography>
                            <Typography paragraph color="text.secondary">
                                3. <strong>Study Master Games:</strong> Watch high-level play on Lichess TV and analyze the moves.
                            </Typography>
                            <Button variant="contained" size="large" fullWidth sx={{ mt: 2 }}>
                                Start Analyzing Now
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
