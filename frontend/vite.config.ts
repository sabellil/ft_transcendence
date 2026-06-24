import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";




// Vite Configuration
export default defineConfig({
	envPrefix: ["APIBASE_URL"],
	plugins: [react()],
});
