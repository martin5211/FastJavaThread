/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    modulePathIgnorePatterns: ['<rootDir>/out/'],
    moduleNameMapper: {
        '^vscode$': '<rootDir>/tests/mocks/vscode.ts',
    },
};
