import { useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { THEME_OPTIONS } from '../theme';
import { useThemePreference } from '../themePreference';

export function ThemeMenu() {
  const { themeId, setThemeId } = useThemePreference();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Button
        size="small"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'theme-menu' : undefined}
        startIcon={<PaletteOutlinedIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Cores
      </Button>
      <Menu
        id="theme-menu"
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          list: { 'aria-label': 'Temas de cor' },
          paper: {
            sx: {
              width: 320,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 0,
            },
          },
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', px: 2, pt: 1.25, pb: 0.5 }}
        >
          Aparência
        </Typography>
        {THEME_OPTIONS.map((option) => {
          const selected = option.id === themeId;
          return (
            <MenuItem
              key={option.id}
              selected={selected}
              onClick={() => {
                setThemeId(option.id);
                setAnchor(null);
              }}
              sx={{ alignItems: 'flex-start', py: 1.25, whiteSpace: 'normal' }}
            >
              <ListItemIcon sx={{ mt: 0.25, minWidth: 36 }}>
                {selected ? <CheckIcon fontSize="small" /> : null}
              </ListItemIcon>
              <Box
                aria-hidden
                sx={{
                  width: 22,
                  height: 22,
                  mt: 0.35,
                  mr: 1.5,
                  flexShrink: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: option.paper,
                  boxShadow: `inset 7px 0 0 ${option.accent}`,
                }}
              />
              <ListItemText
                primary={option.label}
                secondary={option.description}
                slotProps={{
                  primary: { sx: { fontWeight: 600 } },
                  secondary: { sx: { whiteSpace: 'normal' } },
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
