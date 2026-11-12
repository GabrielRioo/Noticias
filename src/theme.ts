import { createTheme, type PaletteOptions, type Theme } from '@mui/material/styles';

export const THEME_IDS = ['jornal', 'leitura', 'noturno', 'clareza', 'calmo'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeOption = {
  id: ThemeId;
  label: string;
  description: string;
  page: string;
  paper: string;
  ink: string;
  accent: string;
};

type ThemeDefinition = ThemeOption & {
  palette: PaletteOptions;
};

const themes: readonly ThemeDefinition[] = [
  {
    id: 'jornal',
    label: 'Jornal',
    description: 'Papel creme, o visual de sempre.',
    page: '#f3eee4',
    paper: '#faf7f0',
    ink: '#1c1917',
    accent: '#7a1414',
    palette: {
      mode: 'light',
      primary: { main: '#7a1414' },
      secondary: { main: '#1c1917' },
      background: { default: '#f3eee4', paper: '#faf7f0' },
      text: { primary: '#1c1917', secondary: '#57534e' },
      divider: '#d6d0c4',
      warning: { main: '#8a4b08' },
    },
  },
  {
    id: 'leitura',
    label: 'Leitura',
    description: 'Sépia quente, com menos luz azul e menos brilho.',
    page: '#e9dfc8',
    paper: '#f6edd9',
    ink: '#3e321f',
    accent: '#7a4510',
    palette: {
      mode: 'light',
      primary: { main: '#7a4510' },
      secondary: { main: '#3e321f' },
      background: { default: '#e9dfc8', paper: '#f6edd9' },
      text: { primary: '#3e321f', secondary: '#5c4a36' },
      divider: '#e0d2b4',
      warning: { main: '#7a4510' },
    },
  },
  {
    id: 'noturno',
    label: 'Noturno',
    description: 'Fundo escuro para ler com pouca luz.',
    page: '#141210',
    paper: '#1e1b17',
    ink: '#ebe4d8',
    accent: '#f0b56a',
    palette: {
      mode: 'dark',
      primary: { main: '#f0b56a' },
      secondary: { main: '#ebe4d8' },
      background: { default: '#141210', paper: '#1e1b17' },
      text: { primary: '#ebe4d8', secondary: '#c4b8a6' },
      divider: '#3d362e',
      warning: { main: '#ffcc80' },
    },
  },
  {
    id: 'clareza',
    label: 'Clareza',
    description: 'Preto no branco, para sol forte ou baixa visão.',
    page: '#f2f2f2',
    paper: '#ffffff',
    ink: '#111111',
    accent: '#0b3a82',
    palette: {
      mode: 'light',
      primary: { main: '#0b3a82' },
      secondary: { main: '#111111' },
      background: { default: '#f2f2f2', paper: '#ffffff' },
      text: { primary: '#111111', secondary: '#3a3a3a' },
      divider: '#c8c8c8',
      warning: { main: '#8a3b00' },
    },
  },
  {
    id: 'calmo',
    label: 'Calmo',
    description: 'Tons frios e baixos, para ler por mais tempo.',
    page: '#e4eef1',
    paper: '#f4f7f8',
    ink: '#1c2b33',
    accent: '#0e5c63',
    palette: {
      mode: 'light',
      primary: { main: '#0e5c63' },
      secondary: { main: '#1c2b33' },
      background: { default: '#e4eef1', paper: '#f4f7f8' },
      text: { primary: '#1c2b33', secondary: '#3e5561' },
      divider: '#d3dee3',
      warning: { main: '#8a4b08' },
    },
  },
];

export const THEME_OPTIONS: readonly ThemeOption[] = themes.map(
  ({ id, label, description, page, paper, ink, accent }) => ({
    id,
    label,
    description,
    page,
    paper,
    ink,
    accent,
  }),
);

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value);
}

export function createAppTheme(id: ThemeId): Theme {
  const definition = themes.find((item) => item.id === id) ?? themes[0];

  return createTheme({
    palette: definition.palette,
    typography: {
      fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
      h1: {
        fontFamily: '"Newsreader", "Georgia", serif',
        fontWeight: 600,
        letterSpacing: '-0.03em',
      },
      h2: {
        fontFamily: '"Newsreader", "Georgia", serif',
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h3: {
        fontFamily: '"Newsreader", "Georgia", serif',
        fontWeight: 600,
      },
      h6: {
        fontFamily: '"Newsreader", "Georgia", serif',
        fontWeight: 600,
      },
      button: {
        fontFamily: '"Source Sans 3", sans-serif',
        fontWeight: 600,
        letterSpacing: '0.08em',
      },
      overline: {
        letterSpacing: '0.18em',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 0,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'uppercase',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: definition.page,
          },
        },
      },
    },
  });
}
