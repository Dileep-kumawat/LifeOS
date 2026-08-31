import type { Meta, StoryObj } from "@storybook/react";
import { ExportButton } from "./ExportButton";

const meta: Meta<typeof ExportButton> = {
  title: "Analytics/ExportButton",
  component: ExportButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Export action control (FR-12.4) offering CSV and PDF download flows with live visual status feedback (Idle, Exporting/Loading, Success, and Rate-Limited / Error states)."
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof ExportButton>;

export const Idle: Story = {
  args: {
    defaultType: "productivity",
    startDate: "2026-08-01",
    endDate: "2026-08-31"
  }
};

export const ExportingLoading: Story = {
  args: {
    defaultType: "productivity",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    forcedState: "loading",
    forcedMessage: "Generating PDF report..."
  }
};

export const SuccessDownloaded: Story = {
  args: {
    defaultType: "finance",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    forcedState: "success",
    forcedMessage: "Downloaded lifeos-finance-2026-08-01-to-2026-08-31.pdf"
  }
};

export const ErrorRateLimited: Story = {
  args: {
    defaultType: "productivity",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    forcedState: "error",
    forcedMessage: "Export rate limit exceeded (20 req/hr). Please try again later."
  }
};
