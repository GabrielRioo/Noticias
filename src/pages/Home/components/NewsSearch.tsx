import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { SEARCH_QUERY_MAX_LENGTH, SEARCH_QUERY_MIN_LENGTH } from '../../../types/news';

type SearchToggleProps = {
  expanded: boolean;
  onOpen: () => void;
};

type SearchFieldProps = {
  initialQuery: string;
  searching: boolean;
  autoFocus: boolean;
  onSearch: (query: string) => void;
  onClear: () => void;
};

export function SearchToggle({ expanded, onOpen }: SearchToggleProps) {
  return (
    <Button type="button" size="small" aria-expanded={expanded} onClick={onOpen}>
      Pesquisar
    </Button>
  );
}

export function SearchField({ initialQuery, searching, autoFocus, onSearch, onClear }: SearchFieldProps) {
  const [draft, setDraft] = useState(initialQuery);
  const query = draft.trim().replace(/\s+/g, ' ');
  const canSubmit =
    !searching &&
    query.length >= SEARCH_QUERY_MIN_LENGTH &&
    query.length <= SEARCH_QUERY_MAX_LENGTH;

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          onSearch(query);
        }
      }}
      sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1.25, flexWrap: 'wrap' }}
    >
      <TextField
        size="small"
        label="Assunto"
        placeholder="Ex.: guerra no Irã, bets, NVIDIA"
        value={draft}
        autoFocus={autoFocus}
        disabled={searching}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClear();
          }
        }}
        slotProps={{ htmlInput: { maxLength: SEARCH_QUERY_MAX_LENGTH } }}
        sx={{ flex: '1 1 220px' }}
      />
      <Button type="submit" variant="contained" size="small" disabled={!canSubmit}>
        {searching ? 'Buscando…' : 'Buscar'}
      </Button>
      <Button type="button" size="small" onClick={onClear}>
        Limpar
      </Button>
    </Box>
  );
}
