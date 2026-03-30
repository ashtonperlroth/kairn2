import { Command } from "commander";

const program = new Command();

program
  .name("kairn")
  .description(
    "Compile natural language intent into optimized Claude Code environments"
  )
  .version("0.1.0");

program.parse();
