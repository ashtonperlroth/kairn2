import { Command } from "commander";
import chalk from "chalk";
import { loadRegistry, loadUserRegistry } from "../registry/loader.js";
import type { RegistryTool } from "../types.js";

const listCommand = new Command("list")
  .description("List tools in the registry")
  .option("--category <cat>", "Filter by category")
  .option("--user-only", "Show only user-defined tools")
  .action(async (options: { category?: string; userOnly?: boolean }) => {
    let all: RegistryTool[];
    let userTools: RegistryTool[];

    try {
      [all, userTools] = await Promise.all([loadRegistry(), loadUserRegistry()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`\n  Failed to load registry: ${msg}\n`));
      process.exit(1);
    }

    const userIds = new Set(userTools.map((t) => t.id));

    let tools = all;

    if (options.userOnly) {
      tools = tools.filter((t) => userIds.has(t.id));
    }

    if (options.category) {
      tools = tools.filter(
        (t) => t.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    if (tools.length === 0) {
      console.log(chalk.dim("\n  No tools found.\n"));
      return;
    }

    const bundledCount = all.filter((t) => !userIds.has(t.id)).length;
    const userCount = userIds.size;

    console.log(chalk.cyan("\n  Registry Tools\n"));

    for (const tool of tools) {
      const isUser = userIds.has(tool.id);
      const meta = [
        tool.category,
        `tier ${tool.tier}`,
        tool.auth,
      ].join(", ");

      console.log(chalk.bold(`  ${tool.id}`) + chalk.dim(` (${meta})`));
      console.log(chalk.dim(`    ${tool.description}`));

      if (tool.best_for.length > 0) {
        console.log(chalk.dim(`    Best for: ${tool.best_for.join(", ")}`));
      }

      if (isUser) {
        console.log(chalk.yellow("    [USER-DEFINED]"));
      }

      console.log("");
    }

    const totalShown = tools.length;
    const shownUser = tools.filter((t) => userIds.has(t.id)).length;
    const shownBundled = totalShown - shownUser;

    console.log(
      chalk.dim(
        `  ${totalShown} tool${totalShown !== 1 ? "s" : ""} (${shownBundled} bundled, ${shownUser} user-defined)`
      ) + "\n"
    );
  });

export const registryCommand = new Command("registry")
  .description("Manage the tool registry")
  .addCommand(listCommand);
