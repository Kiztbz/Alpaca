export function logToFile(message) {
    // Vercel functions have a read-only deployment filesystem. Console output
    // is captured by the platform and must not be allowed to break login.
    console.log(message);
}
