import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'clinical-workspace-flow.spec.js',timeout:15000,workers:1,reporter:'list',use:{headless:true,launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}:{} }});
