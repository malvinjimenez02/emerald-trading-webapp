import { Colors } from './src/theme/colors';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: Colors.background, surface: Colors.surface, secondary: Colors.surfaceSecondary },
        accent: { DEFAULT: Colors.accent, dark: Colors.accentDark },
        text: { DEFAULT: Colors.text, secondary: Colors.textSecondary, tertiary: Colors.textTertiary },
        input: { border: Colors.inputBorder, focus: Colors.inputBorderFocus },
        positive: Colors.positive,
        negative: Colors.negative,
        warning: Colors.warning,
        divider: Colors.divider,
        destructive: Colors.destructive,
        inputBg: Colors.inputBg,
      }
    }
  }
};
