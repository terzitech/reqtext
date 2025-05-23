/**
 * Initializes a new ReqText project.
 *
 * This function implements the logic described in the Mermaid flowchart:
 *
 *   1. User runs: npx reqt init <project name>
 *   2. Checks if arguments are provided. If not, shows usage and exits. (A -> B -> C)
 *   3. Joins arguments into a project name string. (B -> D)
 *   4. Checks for existing .reqt.json files in the current directory. (D -> E)
 *   5. If files exist, prompts the user to confirm creating/switching to a new file. (E -> F)
 *      - If declined, aborts. (F -> G)
 *      - If confirmed, continues. (F -> H)
 *   6. If no files exist, continues. (E -> H)
 *   7. Calls fhr.init with the project name and type 'reqt'. (H -> I)
 *   8. Handles success or error. (I -> J/K)
 *
 * This ensures only one .reqt.json file per folder and provides user interaction for safe project initialization.
 *
 * @param {...string} args - The project name and any additional arguments.
 * @returns {Promise<void>} Resolves when initialization is complete or aborted.
 */
import fs from 'fs/promises';
import enquirer from 'enquirer';
import path from 'path';
import fhr from "@terzitech/flathier";
import { read } from 'fs';

const { prompt } = enquirer;

export default async function init(...args) {
    let promptFn = prompt;
    if (args.length && typeof args[args.length - 1] === 'function') {
        promptFn = args.pop();
    }
    if (args.length === 0) {
        console.log("Usage: npx reqt init <project name>");
        return;
    }
    const argString = args.join('_');
    const cwd = process.cwd();
    const reqtDir = path.join(cwd, '.reqt');
    const configPath = path.join(reqtDir, 'config.reqt.json');
    const templatePath = path.join(reqtDir, 'itemTemplate.reqt.json');
    // Use all arguments joined as the project title (preserve spaces)
    const projectTitle = args.join(' ');
    const safeTitle = projectTitle.replace(/[^a-zA-Z0-9-_]/g, '_');
    const sotFileName = `${safeTitle}.reqt.json`;
    const sotPath = path.join(reqtDir, sotFileName);

    // Check for existing .reqt directory and prompt before overwriting anything inside
    let dirExists = false;
    try {
        await fs.access(reqtDir);
        dirExists = true;
    } catch {}
    if (dirExists) {
        const response = await promptFn({
            type: 'confirm',
            name: 'overwrite',
            message: '⚠️ .reqt directory already exists. Overwrite all reqt project files in this folder?',
            initial: false
        });
        if (!response.overwrite) {
            console.log('❌ Aborted. No changes made.');
            return;
        } else {
            // Remove the entire .reqt directory and its contents
            await fs.rm(reqtDir, { recursive: true, force: true });
            await fs.mkdir(reqtDir);
            console.log('✅ Overwrote .reqt directory and all contents.');
        }
    } else {
        await fs.mkdir(reqtDir);
        console.log(`✅ Created .reqt directory in ${cwd}`);
    }

    // Write config.reqt.json
    const config = {
        projectTitle: projectTitle,
        sotPath: `./.reqt/${sotFileName}`,
        templatePath: './.reqt/itemTemplate.reqt.json'
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Created config.reqt.json');

    // Write itemTemplate.reqt.json (basic template)
    const itemTemplate = {
        reqt_ID: "reqt_ID",
        hier: 0,
        outline: "OUTLINE",
        title: "TITLE",
        details: "DETAILS",
        requirement: "REQUIREMENT",
        acceptance: "ACCEPTANCE",
        readme: "README",
        status: "NEW",
        readme_ai: "exclude",
        test_exists: false,
        test_passed: false
    };
    await fs.writeFile(templatePath, JSON.stringify(itemTemplate, null, 2));
    console.log('✅ Created itemTemplate.reqt.json');

    // Insert itemTemplate into the sot file for the project item
    const sotTemplate = {
        reqt_ID: await fhr.generateUniqueId(),
        hier: 0,
        outline: "0",
        title: safeTitle,
        details: "DETAILS",
        requirement: "REQUIREMENT",
        acceptance: "ACCEPTANCE",
        readme: "README",
        status: "NEW",
        readme_ai: "exclude",
        test_exists: false,
        test_passed: false
    };

    // Write ProjectSOT.reqt.json (array with project item)
    await fs.writeFile(sotPath, JSON.stringify([sotTemplate], null, 2));
    console.log(`✅ Created ${sotFileName}`);

    console.log('✅ ReqText project initialized successfully in .reqt');
}