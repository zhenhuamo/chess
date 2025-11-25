'use client';

import { Box, Container, Typography, Stack } from '@mui/material';
import DailyPuzzleCard from '../components/DailyPuzzleCard';
import DailyPuzzleLanding from './components/DailyPuzzleLanding';

export default function DailyPuzzlePage() {
    return (
        <Box>
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Stack spacing={6}>
                    <Box>
                        <Typography variant="h4" fontWeight={800} gutterBottom>
                            Training Puzzles
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Practice tactics with a curated set of puzzles pulled from our local puzzle vault. No login required, and each
                            puzzle stays available for retries or instant solutions.
                        </Typography>
                    </Box>

                    <Box sx={{ width: '100%' }}>
                        <DailyPuzzleCard />
                    </Box>
                </Stack>
            </Container>

            <DailyPuzzleLanding />
        </Box>
    );
}
