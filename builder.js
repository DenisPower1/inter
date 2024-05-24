/**
 * Written by Denis Power.
 *
 * globalconfig.json options.
 *
 *  {
 *  files: [],
 *  dir: "./core",
 *   types: "./types"
 * }
 *
 *
 *
 */

const { writeFileSync, readFileSync, readdirSync } = require("fs");
const { format } = require("prettier");
const config = getConfig();
const Package = JSON.parse(readFileSync("./package.json"));
const packageLock = JSON.parse(readFileSync("./package-lock.json"));
const buildVersion = process.argv[2];
const buildYear = process.argv[3];
const buildType = process.argv[4];
const isGlobalBuild = buildType.toUpperCase() == "GLOBAL";
const isModuleBuild = buildType.toUpperCase() == "MODULE";
const isTsDeclaration = buildType.toUpperCase() == "TYPES";

class Inter {
  #source;
  #token;
  #peaceOfCode;
  #parsingExport = false;
  #parsingImport = false;
  #reStartTheLoop = false;
  #importConfig = {
    body: "",
  };
  #exportConfig = {
    name: void 0,
    Default: false,
  };
  #removeExportDeclaration = () => {
    const { name, Default } = this.#exportConfig;

    const pattern1 = new RegExp(`export\\s*${name}`, "g");
    const pattern2 = new RegExp(`export(?:\\s*)default(?:\\s*)${name}`, "g");
    const pattern = Default ? pattern2 : pattern1;
    this.#source = this.#source.replace(pattern, name);
    this.#parsingExport = false;
    this.#reStartTheLoop = true;
  };

  #removeImportDeclaration = () => {
    const { body } = this.#importConfig;
    this.#source = this.#source.replace(body, "");
    this.#importConfig.body = "";
    this.#parsingImport = false;
    this.#reStartTheLoop = true;
  };

  constructor(codeString) {
    this.#source = codeString;
  }

  removeImport() {}

  removeExportAndImportDeclaration(module) {
    for (let i = 0; i < this.#source.length; i++) {
      if (this.#reStartTheLoop) {
        this.#reStartTheLoop = false;
        i = 0;
      }

      this.#peaceOfCode = this.#source[i];

      if (!isBlankSpace(this.#peaceOfCode) && !this.#parsingImport)
        this.#token += this.#peaceOfCode;
      else if (this.#parsingImport) {
        this.#importConfig.body += this.#peaceOfCode;

        if (this.#importConfig.body.endsWith(";")) {
          this.#removeImportDeclaration();
        }
      } else if (isBlankSpace(this.#peaceOfCode) && this.#token) {
        if (
          this.#token == "import" &&
          !this.#parsingImport &&
          !this.#parsingExport
        ) {
          this.#parsingImport = true;
          this.#importConfig.body += "import ";
        } else if (
          this.#token == "export" &&
          !this.#parsingExport &&
          !this.#parsingImport &&
          module !== true
        ) {
          this.#parsingExport = true;
        } else if (this.#parsingExport) {
          const { name } = this.#exportConfig;

          if (!name) {
            if (this.#token !== "default") {
              this.#exportConfig.name = this.#token;
              this.#removeExportDeclaration();
            } else this.#exportConfig.Default = true;
          }
        }

        this.#token = "";
      }
    }

    return this.#source;
  }
}

function isBlankSpace(code) {
  return /\s/.test(code);
}

function getConfig() {
  const resultObject = {
    hasFile: false,
    file: void 0,
  };

  try {
    resultObject.file = JSON.parse(readFileSync("./builderconfig.json"));
    resultObject.hasFile = true;
  } catch (e) {
    /*No globalconfig.json*/
  }

  return resultObject;
}

if (!config.hasFile) throw new Error("No `globalconfig.json` file found");

function buildTsDeclaration() {
  const { types } = config.file;
  const files = readdirSync(types);
  let body = "";

  for (const file of files) {
    const fileString = readFileSync(`${types}/${file}`);
    body += fileString;
  }

  writeFileSync("inter.m.d.ts", body);
}

function build() {
  const { files, dir } = config.file;

  let body = "";

  for (const file of files) {
    let fileString = readFileSync(dir ? `${dir}/${file}` : file);
    /**
     * In module build, the exports declaration won't be removed in regular
     * files which contain the Inter core, but the export declaration from
     * the helpers and errors files must be removed, that's why here we're
     * considering them as special.
     */
    const specialFiles = new Set([
      "helpers.js",
      "template/errors.js",
      "renderList/errors.js",
      "ajax/errors.js",
      "ref/errors.js",
      "renderif/errors.js",
      "toattrs/errors.js",
    ]);
    if (specialFiles.has(file) && isModuleBuild) {
      let fileStringBody = "";
      fileStringBody += fileString;
      const frame = new Inter(fileStringBody);
      fileString = frame.removeExportAndImportDeclaration();
    }

    body += fileString;
  }

  const frame = new Inter(body);
  let builtCode;

  if (isGlobalBuild) builtCode = frame.removeExportAndImportDeclaration();
  else if (isModuleBuild)
    builtCode = frame.removeExportAndImportDeclaration(true);

  if (isGlobalBuild) {
    body = `
  
/**
 * Interjs 
 * Version - ${buildVersion}
 * MIT LICENSED BY - Denis Power
 * Repo - https://github.com/interjs/inter
 * 2021 - ${buildYear} 
 * GENERATED BY INTER BUILDER
 * 
 */

  (function () {

    ${builtCode};
	  
  window.Ref = Ref;
  window.renderIf = renderIf;
  window.renderList = renderList;
  window.template = template;
  window.toAttrs = toAttrs;
  window.Backend = Backend;
  console.log("The global version ${buildVersion} of Inter was loaded successfully.")

  })();
  
`;
  } else if (isModuleBuild) {
    body = ` 
	
/**
 * Interjs 
 * Version - ${buildVersion}
 * MIT LICENSED BY - Denis Power
 * Repo - https://github.com/interjs/inter
 * 2021 - ${buildYear} 
 * GENERATED BY INTER BUILDER
 * Module version
 */
    
export const interVersion = "${buildVersion}";
${builtCode}
    `;
  }

  if (isGlobalBuild) writeFileSync("inter.js", format(body));
  else if (isModuleBuild) writeFileSync("inter.m.js", format(body));

  Package.version = buildVersion;
  packageLock.version = buildVersion;

  writeFileSync("package.json", JSON.stringify(Package));
  writeFileSync("package-lock.json", JSON.stringify(packageLock));
}

if (isTsDeclaration) buildTsDeclaration();
else build();
