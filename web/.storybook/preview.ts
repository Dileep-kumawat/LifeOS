import type { Preview } from "@storybook/react";
import "../src/index.css";

// Importing the app's real Tailwind stylesheet here is what makes stories
// render with actual design-system styling instead of unstyled markup —
// per the Phase 0 build plan requirement.
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
