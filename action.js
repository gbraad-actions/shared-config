const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs-extra');
const path = require('path');
const ini = require('ini');
const tmp = require('tmp');

async function action() {
  try {
    // Get the inputs
    const useOutput = core.getInput('use_output') === 'true';
    const configRepo = core.getInput('config_repo');
    const configFile = core.getInput('config_file') || 'config.ini';
    
    // Create a temporary directory for the config repository
    const configDir = tmp.dirSync({ prefix: 'config-repo-' }).name;
    console.log(`Created temporary directory: ${configDir}`);
    
    // Clone the config repository
    console.log(`Cloning config repository: ${configRepo}`);
    await exec.exec('git', ['clone', configRepo, configDir]);
    
    // Determine the full path to the config file
    const fullConfigPath = path.join(configDir, configFile);
    console.log(`Looking for config file at: ${fullConfigPath}`);
    
    // Check if the config file exists
    if (!fs.existsSync(fullConfigPath)) {
      core.setFailed(`Config file not found: ${fullConfigPath}`);
      return;
    }
    
    // Read and parse the INI file
    const configContent = fs.readFileSync(fullConfigPath, 'utf8');
    const parsedConfig = ini.parse(configContent);
    
    console.log('Parsed configuration:', JSON.stringify(parsedConfig, null, 2));
    
    // Process each section and key in the INI file
    const dynamicOutputs = {};
    
    for (const section in parsedConfig) {
      const sectionData = parsedConfig[section];
      const sectionPrefix = `${section.toUpperCase()}_`;
      
      for (const key in sectionData) {
        const outputKey = `${sectionPrefix}${key.toUpperCase()}`;
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
    
    // Clean up the temporary directory
    fs.removeSync(configDir);
    console.log(`Removed temporary directory: ${configDir}`);

  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

// 3... 2... 1...
action();
