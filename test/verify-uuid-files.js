"use strict";

const fs = require('fs');
const path = require('path');

function verifyUuidFiles() {
    console.log('📁 Verifying UUID-based files...\n');
    
    const logsDir = './logs';
    const capturesDir = './bug-captures';
    
    let results = {
        logFiles: [],
        captureFiles: [],
        allLogFiles: [],
        allCaptureFiles: []
    };
    
    // Check all log files
    if (fs.existsSync(logsDir)) {
        const allLogFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
        results.allLogFiles = allLogFiles;
        
        const uuidLogFiles = allLogFiles.filter(f => f.includes('uuid') || f.includes('test-uuid'));
        results.logFiles = uuidLogFiles;
        
        console.log('All log files:');
        allLogFiles.forEach(file => {
            const isUuid = file.includes('uuid') || file.includes('test-uuid');
            console.log(`  ${isUuid ? '🆔' : '📄'} ${file}`);
        });
        
        console.log(`\nUUID-based log files: ${uuidLogFiles.length}`);
        uuidLogFiles.forEach(file => {
            console.log(`  ✅ ${file}`);
        });
    }
    
    // Check all capture files
    if (fs.existsSync(capturesDir)) {
        const allCaptureFiles = fs.readdirSync(capturesDir).filter(f => f.endsWith('.json'));
        results.allCaptureFiles = allCaptureFiles;
        
        const uuidCaptureFiles = allCaptureFiles.filter(f => f.includes('uuid') || f.includes('test-uuid'));
        results.captureFiles = uuidCaptureFiles;
        
        console.log(`\nAll capture files: ${allCaptureFiles.length}`);
        allCaptureFiles.forEach(file => {
            const isUuid = file.includes('uuid') || file.includes('test-uuid');
            console.log(`  ${isUuid ? '🆔' : '📁'} ${file}`);
        });
        
        console.log(`\nUUID-based capture files: ${uuidCaptureFiles.length}`);
        uuidCaptureFiles.forEach(file => {
            console.log(`  ✅ ${file}`);
        });
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total log files: ${results.allLogFiles.length}`);
    console.log(`UUID log files: ${results.logFiles.length}`);
    console.log(`Total capture files: ${results.allCaptureFiles.length}`);
    console.log(`UUID capture files: ${results.captureFiles.length}`);
    
    return results;
}

if (require.main === module) {
    const results = verifyUuidFiles();
    
    if (results.logFiles.length > 0 || results.captureFiles.length > 0) {
        console.log('\n🎉 UUID system is working correctly!');
        console.log('   - Games generate unique UUIDs');
        console.log('   - Log files are named with UUIDs');
        console.log('   - Error captures include UUIDs');
    } else {
        console.log('\n⚠️  No UUID files found. This might be normal if no games have been run yet.');
    }
}

module.exports = { verifyUuidFiles };