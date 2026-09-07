import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";
import { Button } from "../ui/Button";

const meta: Meta<typeof PrivacyPolicyModal> = {
  title: "Privacy/PrivacyPolicyModal",
  component: PrivacyPolicyModal,
  parameters: {
    layout: "centered"
  }
};

export default meta;
type Story = StoryObj<typeof PrivacyPolicyModal>;

export const OpenModal: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Privacy Policy</Button>
        <PrivacyPolicyModal open={open} onOpenChange={setOpen} />
      </div>
    );
  }
};
