import { HomePage } from './pages/Home';
import { ThemePreferenceProvider } from './themePreference';

export function App() {
  return (
    <ThemePreferenceProvider>
      <HomePage />
    </ThemePreferenceProvider>
  );
}
