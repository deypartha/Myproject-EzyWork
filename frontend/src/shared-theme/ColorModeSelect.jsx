import React, { useContext } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { ColorModeContext } from './AppTheme';

export default function ColorModeSelect(props) {
  const { toggleColorMode, mode } = useContext(ColorModeContext);

  return (
    <Box {...props}>
      <Button variant="outlined" size="small" onClick={toggleColorMode}>
        {mode === 'dark' ? 'Light' : 'Dark'}
      </Button>
    </Box>
  );
}
