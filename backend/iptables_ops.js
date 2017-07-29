const child_process = require("child_process");
const util = require("util");

let exec_file = util.promisify(child_process.execFile.bind(child_process));

module.exports.insert_rule = insert_rule;
async function insert_rule(chain_name, rule) {
    let args = ["-I", chain_name, "1"];
    prepare_rule(args, rule);
    await exec_file("iptables", args);
}

module.exports.append_rule = append_rule;
async function append_rule(chain_name, rule) {
    let args = ["-A", chain_name];
    prepare_rule(args, rule);
    await exec_file("iptables", args);
}

module.exports.remove_rule = remove_rule;
async function remove_rule(chain_name, rule) {
    let args = ["-D", chain_name];
    prepare_rule(args, rule);
    await exec_file("iptables", args);
}

function prepare_rule(args, rule) {
    if(rule.protocol) {
        args.push("-p");
        args.push(rule.protocol);
    }
    if(rule.source) {
        args.push("-s");
        args.push(rule.source);
    }
    if(rule.source_port) {
        args.push("--sport");
        args.push("" + rule.source_port);
    }
    if(rule.destination) {
        args.push("-d");
        args.push(rule.destination);
    }
    if(rule.destination_port) {
        args.push("--dport");
        args.push("" + rule.destination_port);
    }
    if(rule.policy) {
        args.push("-j");
        args.push(rule.policy);
    }
}
