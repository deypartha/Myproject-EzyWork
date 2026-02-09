import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Content() {
  return (
    <Box sx={{ maxWidth: 480 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to EzyWork
      </Typography>
      <Typography variant="body1" color="text.secondary">
        This is placeholder content for the authentication page. Replace with real content.
      </Typography>
    </Box>
  );
}
