// Dependencies
// noinspection JSValidateTypes

const platform = require('os').platform();
const path = require('path');
const { Console } = require('console');
const homedir = require('os').homedir();
const fs = require('fs')

// Global variables
let MAIN_DIRECTORY_PATH = "";
let logPath = path.join(__dirname, 'logs');
let previousAction = 'boot';
let bootStarted = false;
let programStart = false;
let quitCleanly = true;

// Auth variables
let AUTHENTICATED_USER = {};
let AUTHENTICATED_USER_EMAIL = "";

// OS Dependent variables
let EXPECTED_PMC_PATH = "";
let portableMCExeFound;
if (platform === "win32") {
  try {
    let pythonScriptPath = path.join(homedir, 'AppData', 'Roaming', 'Python');
    let scriptSources = fs.readdirSync(pythonScriptPath);

    for (let idx in scriptSources) {
      let scriptPath = fs.existsSync(path.join(pythonScriptPath, scriptSources[idx], 'Scripts', 'portablemc.exe'));
      if (scriptPath) {
        portableMCExeFound = true;
        EXPECTED_PMC_PATH = path.join(pythonScriptPath, scriptSources[idx], 'Scripts', 'portablemc.exe')
      }
    }
  } catch (error) {
    EXPECTED_PMC_PATH = "";
  }
  MAIN_DIRECTORY_PATH = path.join(homedir, 'AppData', 'Roaming', '.minecraft');
} else if (platform === 'linux') {
  EXPECTED_PMC_PATH = path.join(homedir, '.local', 'bin', 'portablemc');
  MAIN_DIRECTORY_PATH = path.join(homedir, '.minecraft');
} else {
  throw new Error('Platform Not Supported');
}



// Config Set
let ACTUAL_PMC_LOCATION = "";
function config(options) {
  return new Promise(() => {
    if (!options.EXE_LOCATION) {
      options.EXE_LOCATION = EXPECTED_PMC_PATH;
    }
    if (options.LOG_LOCATION) {
      logPath = options.LOG_LOCATION;
    }
    if (!fs.existsSync(path.join(logPath, 'auth'))) {
      fs.mkdirSync(path.join(logPath, 'auth'));
    }
    if (!fs.existsSync(path.join(logPath, 'game'))) {
      fs.mkdirSync(path.join(logPath, 'game'));
    }
    if (!fs.existsSync(path.join(logPath, 'other'))) {
      fs.mkdirSync(path.join(logPath, 'other'));
    }

    if (options.MAIN_DIR) {
      MAIN_DIRECTORY_PATH = options.MAIN_DIR;
    }
    if (fs.existsSync(options.EXE_LOCATION)) {
      ACTUAL_PMC_LOCATION = options.EXE_LOCATION;
    } else {
      throw new Error('portableMC not found');
    }
  })
}

// Run Config With Default (verifies portablemc install)
config({}).then();



// portableMC Communicator
async function executeMC(params, action) {
  return new Promise((resolve) => {
    if (!action) {
      action = 'other';
    }
    let MAIN_DIRECTORY = [];
    if (MAIN_DIRECTORY_PATH) {
      MAIN_DIRECTORY = ["--main-dir", MAIN_DIRECTORY_PATH];
    }
    quitCleanly = true;
    const logOutput = fs.createWriteStream(path.join(logPath, action, 'latest.log'));
    const logger = new Console({ stdout: logOutput });
    const { spawn } = require('node:child_process');
    const exe = spawn(ACTUAL_PMC_LOCATION, [...MAIN_DIRECTORY, ...params],
      {
        stdio: 'pipe'
      }
    )
    exe.on('exit', function () {
      if (bootStarted) {
        bootStarted = false;
        logger.log('BOOTEND\nPROGRAMEND');
      } else {
        logger.log('GAMEEND\nPROGRAMEND');
      }
      let filename = `${(new Date().toJSON().slice(0, 19))}.log`.replace(/:/g, ";");
      let writer = fs.createWriteStream(path.join(logPath, action, filename));
      writer.write(fs.readFileSync(path.join(logPath, action, 'latest.log')));
      fs.writeFileSync(path.join(logPath, action, 'latest.log'), '');
      bootStarted = false;
      previousAction = 'boot';
      resolve(quitCleanly);
    });

    exe.stdout.on('data', (data) => {
      if (!bootStarted && !programStart) {
        logger.log('PROGRAMSTART');
        logger.log('BOOTSTART');
        bootStarted = true;
        programStart = true;
      }
      let convertedData = data.toString().replace(/(\r\n|\n|\r)/gm, "splitme").replace(/  +/g, ' ');
      let action = convertedData.split("splitme").filter(str => /\w+/.test(str));
      for (let idx in action) {
        let identifyAction = action[idx].match(/(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])/g);
        if (identifyAction == null) {
          identifyAction = 'boot';
        } else {
          identifyAction = 'game';
        }
        if (identifyAction !== previousAction && previousAction !== 'game' && bootStarted) {
          logger.log('\nBOOTEND');
          bootStarted = false;
          logger.log('GAMESTART');
        }
        console.log(action[idx])
        logger.log(action[idx]);
        if (action[idx].includes('Game crashed!')) {
          quitCleanly = false;
        }
        previousAction = identifyAction;
      }
    });
    exe.stderr.on('data', (data) => {
      //logger.log(data.toString().replace(/(\r\n|\n|\r)/gm, ""));
      console.error(data.toString());
    });
  });
}

// Authenticate Users (Microsoft Only)

async function authenticate(email) {
  return new Promise(async (resolve) => {
    if (fs.existsSync(MAIN_DIRECTORY_PATH)) {
      let authFile = path.join(MAIN_DIRECTORY_PATH, 'portablemc_auth.json');
      if (fs.existsSync(authFile)) {
        let authData = JSON.parse(fs.readFileSync(authFile).toString());
        if (authData.microsoft) {
          let loggedUsers = authData.microsoft.sessions;
          if (loggedUsers[email]) {
            AUTHENTICATED_USER = {
              username: loggedUsers[email].username,
              uuid: loggedUsers[email].uuid,
              email: email.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1***@$2")
            };
            AUTHENTICATED_USER_EMAIL = email;
            resolve(AUTHENTICATED_USER);
            return;
          }
        }
      }
    }


    await executeMC(['login', '--auth-service', 'microsoft', email], 'auth');
    let authData = JSON.parse(fs.readFileSync(authFile).toString());
    let loggedUsers = authData.microsoft.sessions;
    if (loggedUsers[email]) {
      AUTHENTICATED_USER = {
        username: loggedUsers[email].username,
        uuid: loggedUsers[email].uuid,
        email: email.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1***@$2")
      };
      AUTHENTICATED_USER_EMAIL = email;
      resolve(AUTHENTICATED_USER);
    }
  })
}

// Get Array of Authenticated Users
function getAuthedUsers() {
  try {
    let authFile = JSON.parse(fs.readFileSync(path.join(MAIN_DIRECTORY_PATH, 'portablemc_auth.json')).toString());
    if (authFile.microsoft) {
      let sessions = authFile.microsoft.sessions;
      let loggedProfiles = [];
      for (let idx in sessions) {
        let obj = {
          email_safe: idx.replace(/(\w{3})[\w.-]+@([\w.]+\w)/, "$1***@$2"),
          email: idx,
          username: sessions[idx].username,
          uuid: sessions[idx].uuid,
        }
        loggedProfiles.push(obj)
      }
      return loggedProfiles;
    }
  } catch (err) {
    return [];
  }

}


//Logout Account
async function logout(email) {
  return new Promise(async () => {
    await executeMC(['logout', '--auth-service', 'microsoft', email],'auth');
    AUTHENTICATED_USER = {};
    AUTHENTICATED_USER_EMAIL = "";
  })
}

//Launch Game

async function launchGame(options,installOnly) {
  let dryParam = [];
  if (installOnly) {
    dryParam = ['--dry']
  }
  return new Promise(async (resolve) => {
    if (!options.version) {
      options.version = 'release';
    }
    if (!options.loader) {
      options.loader = 'standard';
    }
    let allowedLoaders = ['standard','forge','neoforge','legacyfabric','quilt','fabric'];
    if (!allowedLoaders.includes(options.loader)) {
      resolve(false);
      return;
    }
    if (!fs.existsSync(path.join(MAIN_DIRECTORY_PATH,'portablemc_version_manifest.json'))) {
      await executeMC(['search']);
    }
    const versionManifest = JSON.parse(fs.readFileSync(path.join(MAIN_DIRECTORY_PATH,'portablemc_version_manifest.json')).toString());
    if (options.version === 'release') {
      options.version = versionManifest.latest.release;
    }
    if (options.version === 'snapshot') {
      options.version = versionManifest.latest.snapshot;
    }
    let foundVersion = versionManifest.versions.find(version => version.id === options.version) || false;
    if (foundVersion) {
      let bootString = `${options.loader}:${options.version}`;
      const start = await executeMC(['start', bootString, ...dryParam ,'-l', AUTHENTICATED_USER_EMAIL], 'game');
      resolve(start);
    } else {
      resolve(false);
    }
  })
}





module.exports = { launchGame,authenticate,logout,getAuthedUsers }