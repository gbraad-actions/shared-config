const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs-extra');
const path = require('path');
const ini = require('ini');
const tmp = require('tmp');

function extractIniFromMarkdown(mdContent) {
  const configRegex = /### config[\s\S]*?```ini([\s\S]*?)```/m;
  const match = mdContent.match(configRegex);
  return match ? match[1].trim() : null;
}

async function action() {
  try {
    // Get the inputs
    const useOutput = core.getInput('use_output') === 'true';
    const configRepo = core.getInput('config_repo');
    const configFile = core.getInput('config_file') || 'config.ini';
    
    // Set default for force_uppercase based on the output mode
    // Default is true for environment variables, false for outputs
    const forceUppercaseInput = core.getInput('force_uppercase');
    const forceUppercase = forceUppercaseInput !== '' 
      ? forceUppercaseInput === 'true'
      : !useOutput; // Default: true for env vars, false for outputs
    
    console.log(`Using force_uppercase: ${forceUppercase}`);
    
    // Use configuration repository only when given
    let configDir;
    if (configRepo && configRepo.trim().length > 0) {
      // Create a temporary directory for the config repository
      configDir = tmp.dirSync({ prefix: 'config-repo-' }).name;
      console.log(`Created temporary directory: ${configDir}`);
      
      // Clone the config repository
      console.log(`Cloning config repository: ${configRepo}`);
      await exec.exec('git', ['clone', configRepo, configDir]);
    // ... otherwise use the current folder to look for the config_file
    } else {
      // Use current workspace directory
      configDir = process.cwd();
      console.log(`Using current workspace directory: ${configDir}`);
    }
    
    // Determine the full path to the config file
    const fullConfigPath = path.join(configDir, configFile);
    console.log(`Looking for config file at: ${fullConfigPath}`);
    
    // Check if the config file exists
    if (!fs.existsSync(fullConfigPath)) {
      core.setFailed(`Config file not found: ${fullConfigPath}`);
      return;
    }

    // Decide how to extract configuration
    let configContent = fs.readFileSync(fullConfigPath, 'utf8');
    let iniContent;

    if (configFile.endsWith('.md')) {
      iniContent = extractIniFromMarkdown(configContent);
      if (!iniContent) {
        core.setFailed(`No INI block found in Markdown config file: ${fullConfigPath}`);
        return;
      }
    } else {
      iniContent = configContent;
    }

    // Parse the INI content
    const parsedConfig = ini.parse(iniContent);
    console.log('Parsed configuration:', JSON.stringify(parsedConfig, null, 2));
    
    // Process each section and key in the INI file
    const dynamicOutputs = {};
    for (const section in parsedConfig) {
      const sectionData = parsedConfig[section];
      const sectionPrefix = forceUppercase ? `${section.toUpperCase()}_` : `${section}_`;
      for (const key in sectionData) {
        const outputKey = forceUppercase ? `${sectionPrefix}${key.toUpperCase()}` : `${sectionPrefix}${key}`;
        const outputValue = sectionData[key];
        dynamicOutputs[outputKey] = outputValue;
      }
    }
    console.log('Generated outputs:', dynamicOutputs);
    
    // Set outputs or env variables based on user preference
    if (useOutput) {
      for (const key in dynamicOutputs) {
        core.setOutput(key, dynamicOutputs[key]);
        console.log(`Setting output ${key}=${dynamicOutputs[key]}`);
      }
    } else {
      for (const key in dynamicOutputs) {
        core.exportVariable(key, dynamicOutputs[key]);
        console.log(`Setting environment variable ${key}=${dynamicOutputs[key]}`);
      }
    }
    
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

// 3... 2... 1...
action();