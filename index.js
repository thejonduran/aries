require('dotenv').config();

console.log('Aries Engine Starting...');
console.log('Environment Variable Check:', process.env.TEST_VAR);

if (process.env.TEST_VAR === 'Hello from Aries Engine') {
    console.log('SUCCESS: .env loaded correctly.');
} else {
    console.error('FAILURE: .env not loaded correctly.');
}
