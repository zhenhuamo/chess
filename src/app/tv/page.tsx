'use client';

import { Box, Container, Typography, Stack } from '@mui/material';
import LichessTVCard from '../components/LichessTVCard';

export default function TVPage() {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack spacing={4}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom>
                        Lichess TV
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Watch top-rated Blitz games live from Lichess.
                    </Typography>
                </Box>

                <Box sx={{ maxWidth: 600, mx: 'auto', width: '100%' }}>
                    <LichessTVCard />
                </Box>
            </Stack>
        </Container>
    );
}
