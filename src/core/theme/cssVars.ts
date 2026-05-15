import { lightColors, darkColors } from './colors';

function toKebab(s: string) {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function tokensToVars(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([k, v]) => `  --color-${toKebab(k)}: ${v};`)
    .join('\n');
}

export const lightVarsBlock = `:root {\n${tokensToVars(lightColors)}\n}`;
export const darkVarsBlock = `[data-theme="dark"] {\n${tokensToVars(darkColors)}\n}`;
