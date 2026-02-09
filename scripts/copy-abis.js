import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const outputDir = path.join(__dirname, '../frontend/src/abis');

function copyAbi(contractName, fileName) {
    const artifactPath = path.join(artifactsDir, fileName, `${contractName}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    fs.writeFileSync(
        path.join(outputDir, `${contractName}.json`),
        JSON.stringify(abi, null, 2)
    );
    console.log(`Copied ${contractName} ABI to frontend`);
}

copyAbi('LendingProtocol', 'LendingProtocol.sol');
copyAbi('MockToken', 'MockToken.sol');
