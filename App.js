// This file exists because expo/AppEntry.js (hoisted to the monorepo root's
// node_modules) imports its root component as '../../App', which resolves here.
// We re-export the expo-router root component so the app starts correctly.
export { App as default } from 'expo-router/build/qualified-entry';
