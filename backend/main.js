const launcher = require("./launcher.js");

launcher.run_with_config_file(process.argv[2]).then(_ => {}).catch(e => {
    console.log(e);
    process.exit(1);
});
