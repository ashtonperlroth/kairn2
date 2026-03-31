import chalk from "chalk";

const maroon = chalk.rgb(139, 0, 0);
const darkMaroon = chalk.rgb(100, 0, 0);
const warmStone = chalk.rgb(212, 165, 116);
const lightStone = chalk.rgb(220, 190, 160);
const dimStone = chalk.rgb(140, 100, 70);

export const ui = {
  // Brand colors
  brand: (text: string) => maroon.bold(text),
  accent: (text: string) => warmStone(text),

  // Logos and banners
  fullBanner: (subtitle?: string) => {
    const KAIRN_WORDMARK = [
      maroon("██╗  ██╗") + "  " + maroon("█████╗ ") + " " + maroon("██╗") + "  " + maroon("██████╗ ") + "  " + maroon("███╗   ██╗"),
      maroon("██║ ██╔╝") + "  " + maroon("██╔══██╗") + " " + maroon("██║") + "  " + maroon("██╔══██╗") + "  " + maroon("████╗  ██║"),
      warmStone("█████╔╝ ") + "  " + warmStone("███████║") + " " + warmStone("██║") + "  " + warmStone("██████╔╝") + "  " + warmStone("██╔██╗ ██║"),
      warmStone("██╔═██╗ ") + "  " + warmStone("██╔══██║") + " " + warmStone("██║") + "  " + warmStone("██╔══██╗") + "  " + warmStone("██║╚██╗██║"),
      lightStone("██║  ██╗") + "  " + lightStone("██║  ██║") + " " + lightStone("██║") + "  " + lightStone("██║  ██║") + "  " + lightStone("██║ ╚████║"),
      lightStone("╚═╝  ╚═╝") + "  " + lightStone("╚═╝  ╚═╝") + " " + lightStone("╚═╝") + "  " + lightStone("╚═╝  ╚═╝") + "  " + lightStone("╚═╝  ╚═══╝"),
    ];
    console.log("");
    for (const line of KAIRN_WORDMARK) {
      console.log("  " + line);
    }
    if (subtitle) {
      console.log(dimStone(`  ${subtitle}`));
    }
    console.log("");
  },
  compactBanner: (subtitle?: string) => {
    const line = maroon("━").repeat(52);
    console.log(`  ${line}`);
    console.log(`  ${maroon("  ◆")} ${chalk.bold.rgb(139, 0, 0)("KAIRN")}` + (subtitle ? ` ${dimStone("— " + subtitle)}` : ""));
    console.log(`  ${line}`);
  },

  // Section headers
  section: (title: string) => {
    const len = chalk.dim(title).length;
    const line = "━".repeat(Math.max(0, 48 - len));
    return `\n  ${warmStone("━━")} ${chalk.bold(title)} ${chalk.dim(warmStone(line))}`;
  },

  // Status messages
  success: (text: string) => chalk.green(`  ✓ ${text}`),
  warn: (text: string) => chalk.yellow(`  ⚠ ${text}`),
  error: (text: string) => chalk.red(`  ✗ ${text}`),
  info: (text: string) => chalk.cyan(`  ℹ ${text}`),

  // Key-value pairs
  kv: (key: string, value: string) => `  ${chalk.cyan(key.padEnd(14))} ${value}`,

  // File list
  file: (path: string) => chalk.dim(`    ${path}`),

  // Tool display
  tool: (name: string, reason: string) => `    ${warmStone("●")} ${chalk.bold(name)}\n      ${chalk.dim(reason)}`,

  // Divider
  divider: () => chalk.dim(`  ${"─".repeat(50)}`),

  // Command suggestion
  cmd: (command: string) => `    ${chalk.bold.white("$ " + command)}`,

  // Env var setup with signupUrl
  envVarPrompt: (name: string, desc: string, url?: string) => {
    let out = `  ${chalk.bold(name)}${chalk.dim(` (${desc})`)}`;
    if (url) out += `\n    ${chalk.dim("Get one at:")} ${warmStone(url)}`;
    return out;
  },

  // Clarification question
  question: (q: string, suggestion?: string) => {
    let msg = `  ${warmStone("?")} ${chalk.bold(q)}`;
    if (suggestion) {
      msg += `\n    ${chalk.dim(`(suggested: ${suggestion})`)}`;
    }
    return msg;
  },

  // Error box for compile failures
  errorBox: (title: string, message: string) => {
    const line = "─".repeat(50);
    return chalk.red(`\n  ┌${line}┐\n  │ ${title.padEnd(49)}│\n  │ ${message.padEnd(49)}│\n  └${line}┘\n`);
  },
};
