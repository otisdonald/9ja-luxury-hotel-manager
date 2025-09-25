const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Building Hotel Manager Electron App...\n');

// Check if required dependencies are installed
const packageJson = require('./package.json');
const requiredDeps = {
    'electron': '^latest',
    'electron-builder': '^latest'
};

let missingDeps = [];
for (const [dep, version] of Object.entries(requiredDeps)) {
    if (!packageJson.devDependencies[dep] && !packageJson.dependencies[dep]) {
        missingDeps.push(dep);
    }
}

if (missingDeps.length > 0) {
    console.log('❌ Missing required dependencies:');
    missingDeps.forEach(dep => console.log(`   - ${dep}`));
    console.log('\nPlease install them first:');
    console.log(`npm install --save-dev ${missingDeps.join(' ')}\n`);
    process.exit(1);
}

// Check if MongoDB connection is configured
if (!fs.existsSync('.env')) {
    console.log('⚠️  Warning: .env file not found');
    console.log('Please ensure your MongoDB connection is properly configured\n');
}

// Build the app
console.log('📦 Building Electron app...');
const buildProcess = spawn('npm', ['run', 'electron:build'], { 
    stdio: 'inherit',
    shell: true 
});

buildProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ Build completed successfully!');
        console.log('📁 Check the "dist" folder for your packaged application');
        
        // Display build artifacts
        const distPath = path.join(__dirname, 'dist');
        if (fs.existsSync(distPath)) {
            console.log('\n📋 Build artifacts:');
            fs.readdirSync(distPath).forEach(file => {
                const stats = fs.statSync(path.join(distPath, file));
                console.log(`   - ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
            });
        }
    } else {
        console.log(`\n❌ Build failed with code ${code}`);
        console.log('Please check the errors above and try again.');
    }
});

buildProcess.on('error', (err) => {
    console.error('❌ Failed to start build process:', err.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure Node.js and npm are installed');
    console.log('2. Run "npm install" to install dependencies');
    console.log('3. Check that the build script exists in package.json');
});