import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";

// Execute the command
exec("mise plugins --all --urls", async (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }

  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }

  // Regular expression to match plugin name and repository URL
  const regex = /^([\w-]+)\s+(https?:\/\/\S+)\s*$/gm;

  let match;
  let output = "---\neditLink: false\n---\n";

  output +=
    "| Plugin name | Repository URL |\n| ----------- | --------------- |";
  while ((match = regex.exec(stdout)) !== null) {
    const repoUrl = match[2].replace(/\.git$/, "");
    output += `\n| ${match[1]} | ${repoUrl} |`;
  }

  await writeFile("./registry.md", output);
  console.log("Success!");
});
