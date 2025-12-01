import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export default function SignInCard() {
  return (
    <Card sx={{ minWidth: 280, maxWidth: 420 }}>
      <CardContent>
        <Typography variant="h6" component="div">
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Placeholder sign-in card. Replace this with your real sign-in form.
        </Typography>
      </CardContent>
    </Card>
  );
}
